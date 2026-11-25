import { auth } from '../firebase';
import {
  AnalyticsSummary,
  CreateTaskPayload,
  TaskWorkflow,
} from '../types/workflow';

const BACKEND_URL_STORAGE_KEY = 'agentflow_backend_url';

export function normalizeBackendUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return '';

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Please enter a valid URL (for example, https://your-service.onrender.com).');
  }

  if (parsed.username || parsed.password) {
    throw new Error('Backend URL must not include embedded credentials.');
  }

  const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (parsed.protocol !== 'https:' && !(isLocal && parsed.protocol === 'http:')) {
    throw new Error('External backend URL must use https:// (except localhost).');
  }

  return `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}`;
}

export function getEnvBackendUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (typeof envUrl !== 'string' || !envUrl.trim()) return '';
  try {
    return normalizeBackendUrl(envUrl);
  } catch {
    return '';
  }
}

export function getStoredBackendUrl(): string {
  try {
    const saved = localStorage.getItem(BACKEND_URL_STORAGE_KEY) || '';
    return saved ? normalizeBackendUrl(saved) : '';
  } catch {
    return '';
  }
}

export function getActiveApiBaseUrl(): string {
  return getStoredBackendUrl() || getEnvBackendUrl();
}

export function setStoredBackendUrl(raw: string): string {
  const normalized = normalizeBackendUrl(raw);
  try {
    if (normalized) {
      localStorage.setItem(BACKEND_URL_STORAGE_KEY, normalized);
    } else {
      localStorage.removeItem(BACKEND_URL_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }
  return normalized;
}

export function apiUrl(path: string): string {
  const base = getActiveApiBaseUrl();
  if (!base) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function buildAuthorizedHeaders(existing?: HeadersInit, includeAuth = true): Promise<Headers> {
  const headers = new Headers(existing);
  if (includeAuth && auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    } catch {
      // Let request proceed so server responds with explicit 401 if token retrieval failed
    }
  }
  return headers;
}

async function resilientFetch(
  pathOrUrl: string,
  init?: RequestInit,
  retries = 0,
  explicitBaseUrl?: string,
  includeAuth = true
): Promise<Response> {
  const base = explicitBaseUrl !== undefined ? explicitBaseUrl : getActiveApiBaseUrl();
  const targetUrl =
    pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')
      ? pathOrUrl
      : base
        ? `${base}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`
        : pathOrUrl;
  const isCrossOrigin = Boolean(base);
  const headers = await buildAuthorizedHeaders(init?.headers, includeAuth);

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(targetUrl, {
        credentials: isCrossOrigin ? 'omit' : 'same-origin',
        cache: 'no-store',
        ...init,
        headers,
      });

      // If proxy or Render cold-start returned a transient gateway error, retry
      if (retries > 0 && attempt < retries && [502, 503, 504].includes(res.status)) {
        await sleep(600 * (attempt + 1));
        continue;
      }

      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await sleep(600 * (attempt + 1));
        continue;
      }
    }
  }

  const raw = lastError instanceof Error ? lastError.message : String(lastError);
  if (raw.toLowerCase().includes('failed to fetch') || raw.toLowerCase().includes('network')) {
    throw new Error(
      isCrossOrigin
        ? 'Unable to reach the configured Render backend. Make sure the service is live (free Render instances may take ~30s to wake up) and CORS allows this origin.'
        : 'Unable to reach the AgentFlow server. Your preview session may have refreshed—click Retry Connection or reload the page.'
    );
  }
  throw lastError instanceof Error ? lastError : new Error('Network request failed.');
}

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (res.status === 401) {
      throw new Error('Your session has expired. Please sign in again.');
    }
    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}. Please retry or refresh the page.`);
    }
    throw new Error('Unexpected response from server. Please refresh the page to reconnect.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !(data as { error?: string }).error) {
      throw new Error('Your session has expired. Please sign in again.');
    }
    const msg =
      typeof (data as { error?: string }).error === 'string'
        ? (data as { error: string }).error
        : `Request failed with status ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export async function fetchHealth(
  explicitBaseUrl?: string
): Promise<{ status: string; geminiConfigured: boolean; firebaseAuthEnabled?: boolean }> {
  const res = await resilientFetch('/api/health', undefined, 2, explicitBaseUrl, false);
  return parseJsonOrThrow(res);
}

export async function fetchTasks(params?: {
  q?: string;
  category?: string;
  status?: string;
}): Promise<TaskWorkflow[]> {
  const search = new URLSearchParams();
  if (params?.q) search.set('q', params.q);
  if (params?.category && params.category !== 'All') search.set('category', params.category);
  if (params?.status && params.status !== 'All') search.set('status', params.status);
  const qs = search.toString();
  const res = await resilientFetch(`/api/tasks${qs ? `?${qs}` : ''}`, undefined, 3);
  const data = await parseJsonOrThrow<{ tasks: TaskWorkflow[] }>(res);
  return data.tasks;
}

export async function fetchTaskById(taskId: string): Promise<TaskWorkflow> {
  const res = await resilientFetch(`/api/tasks/${encodeURIComponent(taskId)}`, undefined, 2);
  const data = await parseJsonOrThrow<{ task: TaskWorkflow }>(res);
  return data.task;
}

export async function createTask(payload: CreateTaskPayload): Promise<TaskWorkflow> {
  const res = await resilientFetch(
    '/api/tasks',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    1
  );
  const data = await parseJsonOrThrow<{ task: TaskWorkflow }>(res);
  return data.task;
}

export async function retryTask(taskId: string, guidance?: string): Promise<TaskWorkflow> {
  const res = await resilientFetch(`/api/tasks/${encodeURIComponent(taskId)}/retry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guidance }),
  });
  const data = await parseJsonOrThrow<{ task: TaskWorkflow }>(res);
  return data.task;
}

export async function acceptBestResult(taskId: string): Promise<TaskWorkflow> {
  const res = await resilientFetch(`/api/tasks/${encodeURIComponent(taskId)}/accept-best`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await parseJsonOrThrow<{ task: TaskWorkflow }>(res);
  return data.task;
}

export async function deleteTask(taskId: string): Promise<void> {
  const res = await resilientFetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: 'DELETE',
  });
  await parseJsonOrThrow(res);
}

export async function clearAllTasks(): Promise<void> {
  const res = await resilientFetch('/api/tasks', {
    method: 'DELETE',
  });
  await parseJsonOrThrow(res);
}

export async function fetchAnalytics(): Promise<AnalyticsSummary> {
  const res = await resilientFetch('/api/analytics', undefined, 3);
  return parseJsonOrThrow(res);
}

export function subscribeToTaskStream(
  taskId: string,
  onUpdate: (task: TaskWorkflow) => void,
  onError?: (err: Error) => void
): () => void {
  let closed = false;
  let pollTimer: number | null = null;
  const abortController = new AbortController();

  const startPollingFallback = () => {
    if (closed || pollTimer !== null) return;
    pollTimer = window.setInterval(async () => {
      if (closed) return;
      try {
        const latest = await fetchTaskById(taskId);
        if (closed) return;
        onUpdate(latest);
        if (latest.status !== 'in_progress' && pollTimer !== null) {
          window.clearInterval(pollTimer);
          pollTimer = null;
        }
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error('Stream disconnected'));
      }
    }, 2500);
  };

  const connectStream = async () => {
    try {
      const base = getActiveApiBaseUrl();
      const targetUrl = apiUrl(`/api/tasks/${encodeURIComponent(taskId)}/stream`);
      const headers = await buildAuthorizedHeaders({ Accept: 'text/event-stream' }, true);

      const response = await fetch(targetUrl, {
        method: 'GET',
        headers,
        credentials: base ? 'omit' : 'same-origin',
        cache: 'no-store',
        signal: abortController.signal,
      });

      if (!response.ok || !response.body) {
        if (response.status === 401 || response.status === 403) {
          onError?.(new Error('Authentication required to stream this task.'));
          return;
        }
        startPollingFallback();
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let latestStatus: TaskWorkflow['status'] = 'in_progress';

      while (!closed) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() ?? '';

        for (const frame of frames) {
          const dataLines = frame
            .split(/\r?\n/)
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trimStart());
          if (dataLines.length === 0) continue;

          const payload = dataLines.join('\n').trim();
          if (!payload) continue;

          try {
            const parsed = JSON.parse(payload) as TaskWorkflow;
            latestStatus = parsed.status;
            onUpdate(parsed);
          } catch {
            // Ignore non-JSON heartbeat frames
          }
        }
      }

      if (!closed && latestStatus === 'in_progress') {
        startPollingFallback();
      }
    } catch (err) {
      if (closed) return;
      if (err instanceof DOMException && err.name === 'AbortError') return;
      startPollingFallback();
    }
  };

  void connectStream();

  return () => {
    closed = true;
    abortController.abort();
    if (pollTimer !== null) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
  };
}
