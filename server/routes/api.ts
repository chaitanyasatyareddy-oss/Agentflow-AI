import { Router } from 'express';
import {
  CreateTaskPayload,
  OutputFormat,
  TaskCategory,
} from '../../src/types/workflow.ts';
import { taskStore } from '../database/store.ts';
import {
  AuthenticatedRequest,
  isFirebaseAuthConfigured,
  requireFirebaseAuth,
} from '../middleware/auth.ts';
import {
  acceptBestAvailableResult,
  createWorkflowTask,
  retryOrGuideTask,
  runOrchestration,
} from '../orchestration/orchestrator.ts';

const VALID_CATEGORIES: TaskCategory[] = [
  'Business',
  'Research',
  'Education',
  'Technology',
  'Marketing',
  'Project Planning',
  'General',
];

const VALID_FORMATS: OutputFormat[] = [
  'Detailed Report',
  'Business Plan',
  'Presentation Content',
  'Research Document',
  'Step-by-Step Guide',
  'Custom Output',
];

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  const hasApiKey = Boolean(
    process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY.trim() !== '' &&
      process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
  );
  res.json({
    status: 'ok',
    geminiConfigured: hasApiKey,
    firebaseAuthEnabled: isFirebaseAuthConfigured(),
    timestamp: new Date().toISOString(),
  });
});

apiRouter.use(requireFirebaseAuth);

apiRouter.get('/analytics', (req: AuthenticatedRequest, res) => {
  const user = req.authUser!;
  res.json(taskStore.getAnalytics(user.uid, user.isAdmin));
});

apiRouter.get('/tasks', (req: AuthenticatedRequest, res) => {
  const user = req.authUser!;
  const query = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
  const category = typeof req.query.category === 'string' ? req.query.category : '';
  const status = typeof req.query.status === 'string' ? req.query.status : '';

  let tasks = taskStore.listTasksForUser(user.uid, user.isAdmin);
  if (query) {
    tasks = tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.userRequest.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query)
    );
  }
  if (category && category !== 'All') {
    tasks = tasks.filter((t) => t.category === category);
  }
  if (status && status !== 'All') {
    tasks = tasks.filter((t) => t.status === status);
  }

  res.json({ tasks });
});

apiRouter.post('/tasks', (req: AuthenticatedRequest, res) => {
  const user = req.authUser!;
  const body = req.body as Partial<CreateTaskPayload>;
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';

  if (!title || title.length < 3 || title.length > 200) {
    res.status(400).json({
      error: 'Task title is required and must be between 3 and 200 characters.',
    });
    return;
  }

  if (!description || description.length < 10 || description.length > 6000) {
    res.status(400).json({
      error: 'Detailed task description must be between 10 and 6000 characters.',
    });
    return;
  }

  const category: TaskCategory = VALID_CATEGORIES.includes(body.category as TaskCategory)
    ? (body.category as TaskCategory)
    : 'General';

  const outputFormat: OutputFormat = VALID_FORMATS.includes(body.outputFormat as OutputFormat)
    ? (body.outputFormat as OutputFormat)
    : 'Detailed Report';

  const qualityThreshold =
    typeof body.qualityThreshold === 'number' && !Number.isNaN(body.qualityThreshold)
      ? Math.max(50, Math.min(95, Math.round(body.qualityThreshold)))
      : 80;

  const maxReviewCycles =
    typeof body.maxReviewCycles === 'number' && !Number.isNaN(body.maxReviewCycles)
      ? Math.max(1, Math.min(3, Math.round(body.maxReviewCycles)))
      : 3;

  const task = createWorkflowTask(
    {
      title,
      description,
      category,
      outputFormat,
      additionalInstructions:
        typeof body.additionalInstructions === 'string'
          ? body.additionalInstructions.slice(0, 2000)
          : '',
      qualityThreshold,
      maxReviewCycles,
    },
    { uid: user.uid, email: user.email }
  );

  void runOrchestration(task.taskId);

  res.status(201).json({ task });
});

apiRouter.get('/tasks/:id', (req: AuthenticatedRequest, res) => {
  const user = req.authUser!;
  const taskId = String(req.params.id);
  const task = taskStore.getTask(taskId);
  if (!task) {
    res.status(404).json({ error: 'Task not found.' });
    return;
  }
  if (!taskStore.canAccessTask(task, user.uid, user.isAdmin)) {
    res.status(403).json({ error: 'You do not have permission to view this task.' });
    return;
  }
  res.json({ task });
});

apiRouter.get('/tasks/:id/stream', (req: AuthenticatedRequest, res) => {
  const user = req.authUser!;
  const taskId = String(req.params.id);
  const task = taskStore.getTask(taskId);
  if (!task) {
    res.status(404).json({ error: 'Task not found.' });
    return;
  }
  if (!taskStore.canAccessTask(task, user.uid, user.isAdmin)) {
    res.status(403).json({ error: 'You do not have permission to stream this task.' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const sendUpdate = (snapshot: unknown) => {
    res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
  };

  sendUpdate(task);

  const unsubscribe = taskStore.subscribe(taskId, (updated) => {
    sendUpdate(updated);
  });

  const keepAlive = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
    unsubscribe();
    res.end();
  });
});

apiRouter.post('/tasks/:id/retry', (req: AuthenticatedRequest, res) => {
  const user = req.authUser!;
  const taskId = String(req.params.id);
  const existing = taskStore.getTask(taskId);
  if (!existing) {
    res.status(404).json({ error: 'Task not found.' });
    return;
  }
  if (!taskStore.canAccessTask(existing, user.uid, user.isAdmin)) {
    res.status(403).json({ error: 'You do not have permission to retry this task.' });
    return;
  }

  const guidance =
    typeof req.body?.guidance === 'string' ? req.body.guidance.trim().slice(0, 2000) : undefined;

  void retryOrGuideTask(taskId, guidance);
  res.json({ task: taskStore.getTask(taskId) });
});

apiRouter.post('/tasks/:id/accept-best', async (req: AuthenticatedRequest, res) => {
  const user = req.authUser!;
  const taskId = String(req.params.id);
  const existing = taskStore.getTask(taskId);
  if (!existing) {
    res.status(404).json({ error: 'Task not found.' });
    return;
  }
  if (!taskStore.canAccessTask(existing, user.uid, user.isAdmin)) {
    res.status(403).json({ error: 'You do not have permission to modify this task.' });
    return;
  }

  void acceptBestAvailableResult(taskId);
  res.json({ task: taskStore.getTask(taskId) });
});

apiRouter.delete('/tasks/:id', (req: AuthenticatedRequest, res) => {
  const user = req.authUser!;
  const taskId = String(req.params.id);
  const existing = taskStore.getTask(taskId);
  if (!existing) {
    res.status(404).json({ error: 'Task not found.' });
    return;
  }
  if (!taskStore.canAccessTask(existing, user.uid, user.isAdmin)) {
    res.status(403).json({ error: 'You do not have permission to delete this task.' });
    return;
  }
  taskStore.deleteTask(taskId);
  res.json({ deleted: true, taskId });
});

apiRouter.delete('/tasks', (req: AuthenticatedRequest, res) => {
  const user = req.authUser!;
  taskStore.clearTasksForUser(user.uid, user.isAdmin);
  res.json({ cleared: true });
});
