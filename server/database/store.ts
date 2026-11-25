import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import {
  AgentRoleKey,
  AnalyticsSummary,
  TaskWorkflow,
} from '../../src/types/workflow.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'agentflow-db.json');

interface PersistedSchema {
  tasks: TaskWorkflow[];
}

class TaskStore {
  private tasks: Map<string, TaskWorkflow> = new Map();
  private emitter = new EventEmitter();
  private writeQueue: Promise<void> = Promise.resolve();
  private initialized = false;

  constructor() {
    this.emitter.setMaxListeners(100);
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    if (this.initialized) return;
    this.initialized = true;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as PersistedSchema;
        if (Array.isArray(parsed.tasks)) {
          for (const task of parsed.tasks) {
            // If server restarted while a task was in_progress, mark it cleanly as recoverable failure
            if (task.status === 'in_progress') {
              task.status = 'failed';
              task.currentStage = 'failed';
              task.stopReason =
                'Server restarted during execution. You can retry or inspect partial outputs.';
            }
            this.tasks.set(task.taskId, task);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load persisted tasks:', err);
    }
  }

  private persistToDisk(): void {
    const snapshot: PersistedSchema = {
      tasks: this.listTasks(),
    };
    const serialized = JSON.stringify(snapshot, null, 2);

    this.writeQueue = this.writeQueue
      .then(async () => {
        if (!fs.existsSync(DATA_DIR)) {
          await fs.promises.mkdir(DATA_DIR, { recursive: true });
        }
        const tempPath = `${DB_FILE}.tmp`;
        await fs.promises.writeFile(tempPath, serialized, 'utf-8');
        await fs.promises.rename(tempPath, DB_FILE);
      })
      .catch((err) => {
        console.error('Failed to persist tasks to disk:', err);
      });
  }

  public listTasks(): TaskWorkflow[] {
    return Array.from(this.tasks.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public canAccessTask(task: TaskWorkflow, uid: string, isAdmin: boolean): boolean {
    if (task.ownerUid) {
      return task.ownerUid === uid;
    }
    return isAdmin;
  }

  public listTasksForUser(uid: string, isAdmin: boolean): TaskWorkflow[] {
    return this.listTasks().filter((task) => this.canAccessTask(task, uid, isAdmin));
  }

  public getTask(taskId: string): TaskWorkflow | undefined {
    return this.tasks.get(taskId);
  }

  public saveTask(task: TaskWorkflow): TaskWorkflow {
    task.updatedAt = new Date().toISOString();
    const cloned = structuredClone(task);
    this.tasks.set(task.taskId, cloned);
    this.persistToDisk();
    this.emitter.emit(`task:${task.taskId}`, cloned);
    return cloned;
  }

  public deleteTask(taskId: string): boolean {
    const deleted = this.tasks.delete(taskId);
    if (deleted) {
      this.persistToDisk();
    }
    return deleted;
  }

  public clearAllTasks(): void {
    this.tasks.clear();
    this.persistToDisk();
  }

  public clearTasksForUser(uid: string, isAdmin: boolean): void {
    let changed = false;
    for (const [id, task] of this.tasks.entries()) {
      if (this.canAccessTask(task, uid, isAdmin)) {
        this.tasks.delete(id);
        changed = true;
      }
    }
    if (changed) {
      this.persistToDisk();
    }
  }

  public subscribe(taskId: string, listener: (task: TaskWorkflow) => void): () => void {
    const eventName = `task:${taskId}`;
    this.emitter.on(eventName, listener);
    return () => {
      this.emitter.off(eventName, listener);
    };
  }

  public getAnalytics(uid?: string, isAdmin = false): AnalyticsSummary {
    const all = uid ? this.listTasksForUser(uid, isAdmin) : this.listTasks();
    const totalTasks = all.length;

    const completedTasks = all.filter((t) => t.status === 'completed').length;
    const completedWithLimitations = all.filter(
      (t) => t.status === 'completed_with_limitations'
    ).length;
    const inProgressTasks = all.filter((t) => t.status === 'in_progress').length;
    const failedOrNeedsReviewTasks = all.filter(
      (t) => t.status === 'failed' || t.status === 'needs_human_review'
    ).length;

    const scoredTasks = all.filter(
      (t) =>
        t.finalResult?.finalQualityScore !== undefined &&
        t.finalResult?.finalQualityScore !== null
    );
    const averageQualityScore =
      scoredTasks.length > 0
        ? Math.round(
            (scoredTasks.reduce((sum, t) => sum + (t.finalResult?.finalQualityScore ?? 0), 0) /
              scoredTasks.length) *
              10
          ) / 10
        : null;

    const reviewedTasks = all.filter((t) => t.reviewHistory.length > 0);
    const averageReviewIterations =
      reviewedTasks.length > 0
        ? Math.round(
            (reviewedTasks.reduce((sum, t) => sum + t.reviewHistory.length, 0) /
              reviewedTasks.length) *
              10
          ) / 10
        : null;

    const agentKeys: AgentRoleKey[] = ['planner', 'researcher', 'creator', 'reviewer', 'approver'];
    const agentLabels: Record<AgentRoleKey, string> = {
      planner: 'Master Planner',
      researcher: 'Research Specialist',
      creator: 'Creator Agent',
      reviewer: 'Critic / Reviewer',
      approver: 'Final Approver',
    };

    let totalAgentExecutions = 0;
    const agentStats = agentKeys.map((key) => {
      let executions = 0;
      let completedCount = 0;
      let rejectedCount = 0;
      let failedCount = 0;

      for (const task of all) {
        const agent = task.agents[key];
        executions += agent.executionCount || 0;
        if (agent.status === 'completed' || agent.status === 'approved') {
          completedCount += 1;
        }
        if (agent.status === 'failed') {
          failedCount += 1;
        }
        if (key === 'reviewer') {
          rejectedCount += task.reviewHistory.filter((r) => !r.approved).length;
        }
      }

      totalAgentExecutions += executions;
      return {
        key,
        name: agentLabels[key],
        totalExecutions: executions,
        completedCount,
        rejectedCount,
        failedCount,
      };
    });

    const finishedTasks = all.filter((t) => t.status !== 'in_progress');
    const successfulCount = completedTasks + completedWithLimitations;
    const completionRate =
      finishedTasks.length > 0
        ? Math.round((successfulCount / finishedTasks.length) * 100)
        : null;

    const categoryCounts = new Map<string, number>();
    for (const task of all) {
      categoryCounts.set(task.category, (categoryCounts.get(task.category) ?? 0) + 1);
    }
    const categoryDistribution = Array.from(categoryCounts.entries()).map(([category, count]) => ({
      category,
      count,
    }));

    const recentQualityTrend = all
      .filter((t) => t.finalResult !== null || t.reviewHistory.length > 0)
      .slice(0, 10)
      .reverse()
      .map((t) => ({
        taskId: t.taskId,
        title: t.title,
        score:
          t.finalResult?.finalQualityScore ??
          t.reviewHistory[t.reviewHistory.length - 1]?.qualityScore ??
          0,
        cycles: t.reviewHistory.length,
        createdAt: t.createdAt,
      }));

    return {
      totalTasks,
      completedTasks,
      completedWithLimitations,
      inProgressTasks,
      failedOrNeedsReviewTasks,
      averageQualityScore,
      averageReviewIterations,
      totalAgentExecutions,
      completionRate,
      agentStats,
      categoryDistribution,
      recentQualityTrend,
    };
  }
}

export const taskStore = new TaskStore();
