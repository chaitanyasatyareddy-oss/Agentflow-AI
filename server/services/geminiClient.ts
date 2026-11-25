import { GoogleGenAI, Schema, ThinkingLevel } from '@google/genai';

const PRIMARY_MODEL = 'gemini-4-hydrogen';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite';

export const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_BASE_BACKOFF_MS = 2000;

export class AgentExecutionError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;
  public readonly statusCode?: number;
  public readonly retryAttempts: number;

  constructor(
    message: string,
    code = 'AGENT_EXECUTION_ERROR',
    retryable = true,
    statusCode?: number,
    retryAttempts = 0
  ) {
    super(message);
    this.name = 'AgentExecutionError';
    this.code = code;
    this.retryable = retryable;
    this.statusCode = statusCode;
    this.retryAttempts = retryAttempts;
  }
}

export interface RetryEventInfo {
  agentName: string;
  retryAttempt: number;
  maxRetries: number;
  delayMs: number;
  statusCode?: number;
  reason: string;
  nextModel: string;
}

let cachedClient: GoogleGenAI | null = null;
let cachedApiKey: string | undefined;

const dailyQuotaCooldownUntil = new Map<string, number>();

function clearModelCooldowns(): void {
  dailyQuotaCooldownUntil.clear();
}

function isModelInDailyCooldown(model: string): boolean {
  const until = dailyQuotaCooldownUntil.get(model);
  if (!until) return false;
  if (Date.now() >= until) {
    dailyQuotaCooldownUntil.delete(model);
    return false;
  }
  return true;
}

function markModelDailyCooldown(model: string, retryDelayMs?: number): void {
  const fallbackMs = 15 * 60 * 1000;
  const durationMs =
    typeof retryDelayMs === 'number' && retryDelayMs > 0
      ? Math.min(retryDelayMs, 60 * 60 * 1000)
      : fallbackMs;
  dailyQuotaCooldownUntil.set(model, Date.now() + durationMs);
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new AgentExecutionError(
      'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets to execute AI agents.',
      'MISSING_API_KEY',
      false
    );
  }

  if (!cachedClient || cachedApiKey !== apiKey) {
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
        timeout: 60000,
      },
    });
    cachedApiKey = apiKey;
    clearModelCooldowns();
  }
  return cachedClient;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractNumericStatus(err: unknown): number | undefined {
  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    if (typeof obj.status === 'number') return obj.status;
    if (typeof obj.statusCode === 'number') return obj.statusCode;
    if (typeof obj.code === 'number') return obj.code;
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (/\b503\b/.test(msg)) return 503;
  if (/\b429\b/.test(msg)) return 429;
  if (/\b404\b/.test(msg)) return 404;
  if (/\b403\b/.test(msg)) return 403;
  if (/\b400\b/.test(msg)) return 400;
  return undefined;
}

function extractRetryDelayMs(rawMessage: string): number | undefined {
  const secMatch = rawMessage.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/i);
  if (secMatch) {
    return Math.ceil(Number(secMatch[1]) * 1000);
  }
  const textMatch = rawMessage.match(/retry in\s+(?:(\d+)h)?(?:(\d+)m)?(\d+(?:\.\d+)?)s/i);
  if (textMatch) {
    const hours = Number(textMatch[1] || 0);
    const mins = Number(textMatch[2] || 0);
    const secs = Number(textMatch[3] || 0);
    return Math.ceil((hours * 3600 + mins * 60 + secs) * 1000);
  }
  return undefined;
}

export function parseErrorDetails(err: unknown): {
  message: string;
  code: string;
  retryable: boolean;
  statusCode?: number;
  shortReason: string;
  isDailyQuota?: boolean;
  retryDelayMs?: number;
} {
  const rawMessage = err instanceof Error ? err.message : String(err);
  const lower = rawMessage.toLowerCase();
  const statusCode = extractNumericStatus(err);
  const retryDelayMs = extractRetryDelayMs(rawMessage);

  if (
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    (statusCode === 400 && lower.includes('key'))
  ) {
    return {
      message:
        'The configured Gemini API key appears invalid (400). Please verify GEMINI_API_KEY in Settings > Secrets.',
      code: 'API_KEY_INVALID',
      retryable: false,
      statusCode: 400,
      shortReason: 'Invalid API key (400)',
    };
  }
  if (lower.includes('permission_denied') || statusCode === 403) {
    return {
      message:
        'Permission denied by Gemini API (403). Check your API key permissions in Settings > Secrets.',
      code: 'PERMISSION_DENIED',
      retryable: false,
      statusCode: 403,
      shortReason: 'Permission denied (403)',
    };
  }
  if (
    statusCode === 503 ||
    lower.includes('unavailable') ||
    lower.includes('high demand') ||
    lower.includes('overloaded') ||
    lower.includes('service unavailable')
  ) {
    return {
      message:
        'Gemini API error 503 (high demand / service temporarily unavailable).',
      code: 'SERVICE_UNAVAILABLE',
      retryable: true,
      statusCode: 503,
      shortReason: 'Gemini API 503 (high demand)',
    };
  }
  if (
    statusCode === 429 ||
    lower.includes('resource_exhausted') ||
    lower.includes('rate limit') ||
    lower.includes('quota') ||
    lower.includes('too many requests')
  ) {
    const isDailyQuota =
      lower.includes('perday') ||
      lower.includes('requests per day') ||
      lower.includes('freetier') ||
      lower.includes('free tier') ||
      (typeof retryDelayMs === 'number' && retryDelayMs > 120_000);

    return {
      message: isDailyQuota
        ? 'Daily Gemini API free-tier quota exceeded (429). Select a billing-enabled API key in Settings > Secrets or retry after the daily quota resets.'
        : 'Gemini API rate limit reached (429). Please wait a moment and retry.',
      code: isDailyQuota ? 'QUOTA_EXHAUSTED' : 'RESOURCE_EXHAUSTED',
      retryable: !isDailyQuota,
      statusCode: 429,
      shortReason: isDailyQuota ? 'Gemini daily quota reached (429)' : 'Gemini API 429 (rate limit)',
      isDailyQuota,
      retryDelayMs,
    };
  }
  if (lower.includes('not_found') || statusCode === 404) {
    return {
      message: `Requested Gemini model (${PRIMARY_MODEL}) was not found or is unavailable (404).`,
      code: 'MODEL_NOT_FOUND',
      retryable: false,
      statusCode: 404,
      shortReason: 'Model not found (404)',
    };
  }
  if (lower.includes('timeout') || lower.includes('aborted') || lower.includes('timed out')) {
    return {
      message: 'Gemini API request timed out before returning a response.',
      code: 'REQUEST_TIMEOUT',
      retryable: true,
      shortReason: 'Request timed out',
    };
  }
  return {
    message: rawMessage || 'Unexpected error communicating with Gemini API.',
    code: 'UPSTREAM_ERROR',
    retryable: true,
    statusCode,
    shortReason: rawMessage || 'Upstream API error',
  };
}

export interface GenerateStructuredOptions {
  agentName: string;
  systemInstruction: string;
  prompt: string;
  responseSchema: Schema;
  seed?: number;
  maxRetries?: number;
  baseBackoffMs?: number;
  onRetry?: (info: RetryEventInfo) => void;
  shouldAbort?: () => boolean;
  invokeModel?: (args: { model: string; prompt: string }) => Promise<string | undefined>;
}

export async function generateStructuredJson<T>(
  options: GenerateStructuredOptions
): Promise<T> {
  const maxRetries = Math.max(0, Math.min(MAX_RETRY_ATTEMPTS, options.maxRetries ?? MAX_RETRY_ATTEMPTS));
  const baseBackoffMs = options.baseBackoffMs ?? DEFAULT_BASE_BACKOFF_MS;
  const client = options.invokeModel ? null : getGeminiClient();

  let lastParsedError: ReturnType<typeof parseErrorDetails> | null = null;
  let lastStatusCode: number | undefined;
  const exhaustedInRun = new Set<string>();

  const chooseModelForAttempt = (attemptIndex: number, prevStatus?: number): string | null => {
    const candidates = [PRIMARY_MODEL, FALLBACK_MODEL].filter(
      (m) => !exhaustedInRun.has(m) && (options.invokeModel || !isModelInDailyCooldown(m))
    );
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    if (attemptIndex === 0) return candidates[0];
    if (attemptIndex === maxRetries) return candidates[candidates.length - 1];
    if (attemptIndex === 1 && (prevStatus === 503 || prevStatus === 429)) {
      return candidates[1];
    }
    return attemptIndex % 2 === 1 ? candidates[1] : candidates[0];
  };

  for (let retryIndex = 0; retryIndex <= maxRetries; retryIndex++) {
    if (options.shouldAbort?.()) {
      throw new AgentExecutionError(
        `${options.agentName} execution was cancelled because the task was removed.`,
        'EXECUTION_ABORTED',
        false,
        undefined,
        retryIndex
      );
    }

    const model = chooseModelForAttempt(retryIndex, lastStatusCode);
    if (!model) {
      throw new AgentExecutionError(
        'Daily Gemini API free-tier quota exceeded across available models. Select a billing-enabled API key in Settings > Secrets or retry after the quota resets.',
        'QUOTA_EXHAUSTED',
        false,
        429,
        retryIndex
      );
    }

    const startMs = Date.now();

    try {
      let rawText: string;

      if (options.invokeModel) {
        rawText = (await options.invokeModel({ model, prompt: options.prompt })) ?? '';
      } else {
        const response = await client!.models.generateContent({
          model,
          contents: options.prompt,
          config: {
            systemInstruction: options.systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: options.responseSchema,
            ...(model === PRIMARY_MODEL
              ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
              : {}),
            ...(typeof options.seed === 'number' ? { seed: options.seed } : {}),
          },
        });
        rawText = response.text ?? '';
      }

      const trimmed = rawText.trim();
      if (!trimmed) {
        throw new AgentExecutionError(
          `${options.agentName} returned an empty response from Gemini.`,
          'EMPTY_RESPONSE',
          true,
          undefined,
          retryIndex
        );
      }

      const cleaned = trimmed
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      try {
        const parsed = JSON.parse(cleaned) as T;
        console.log(
          `[Gemini] ${options.agentName} (${model}) completed in ${Date.now() - startMs}ms${
            retryIndex > 0 ? ` after ${retryIndex} retry attempt(s)` : ''
          }`
        );
        return parsed;
      } catch {
        throw new AgentExecutionError(
          `${options.agentName} produced malformed JSON output that could not be parsed.`,
          'INVALID_JSON',
          true,
          undefined,
          retryIndex
        );
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(
        `[Gemini] ${options.agentName} (${model}) attempt ${retryIndex + 1}/${maxRetries + 1} failed after ${
          Date.now() - startMs
        }ms:`,
        errMsg
      );

      if (err instanceof AgentExecutionError && !err.retryable) {
        throw err;
      }

      const parsed = parseErrorDetails(err);
      lastParsedError = parsed;
      lastStatusCode = parsed.statusCode;

      if (parsed.isDailyQuota) {
        exhaustedInRun.add(model);
        if (!options.invokeModel) {
          markModelDailyCooldown(model, parsed.retryDelayMs);
        }
      }

      const nextRetryAttempt = retryIndex + 1;
      const nextModel =
        nextRetryAttempt <= maxRetries
          ? chooseModelForAttempt(nextRetryAttempt, lastStatusCode)
          : null;

      const canFailoverAfterDailyQuota = parsed.isDailyQuota && nextModel !== null;
      const canRetry = (parsed.retryable || canFailoverAfterDailyQuota) && nextModel !== null;

      if (!canRetry) {
        const exhaustedNotice =
          retryIndex > 0
            ? ` Failed after ${retryIndex} automatic retry attempt(s).`
            : '';
        const baseMessage =
          err instanceof AgentExecutionError ? err.message : parsed.message;
        throw new AgentExecutionError(
          `${baseMessage}${exhaustedNotice}`,
          err instanceof AgentExecutionError ? err.code : parsed.code,
          parsed.retryable,
          parsed.statusCode,
          retryIndex
        );
      }

      const delayMs = canFailoverAfterDailyQuota
        ? 400
        : parsed.statusCode === 429 && typeof parsed.retryDelayMs === 'number'
          ? Math.min(Math.max(parsed.retryDelayMs, baseBackoffMs), 15000)
          : baseBackoffMs * Math.pow(2, retryIndex);

      options.onRetry?.({
        agentName: options.agentName,
        retryAttempt: nextRetryAttempt,
        maxRetries,
        delayMs,
        statusCode: parsed.statusCode,
        reason: parsed.shortReason,
        nextModel,
      });

      await sleep(delayMs);
    }
  }

  throw new AgentExecutionError(
    lastParsedError?.message || `${options.agentName} failed after ${maxRetries} retry attempts.`,
    lastParsedError?.code || 'UPSTREAM_ERROR',
    false,
    lastParsedError?.statusCode,
    maxRetries
  );
}
