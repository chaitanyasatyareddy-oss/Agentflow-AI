import { GoogleGenAI, Schema, ThinkingLevel } from '@google/genai';

const PRIMARY_MODEL = 'gemini-4-hydrogen';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite';

export class AgentExecutionError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;

  constructor(message: string, code = 'AGENT_EXECUTION_ERROR', retryable = true) {
    super(message);
    this.name = 'AgentExecutionError';
    this.code = code;
    this.retryable = retryable;
  }
}

let cachedClient: GoogleGenAI | null = null;
let cachedApiKey: string | undefined;

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
        timeout: 45000,
      },
    });
    cachedApiKey = apiKey;
  }
  return cachedClient;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseErrorDetails(err: unknown): {
  message: string;
  code: string;
  retryable: boolean;
  isHighDemand: boolean;
} {
  const rawMessage = err instanceof Error ? err.message : String(err);
  const lower = rawMessage.toLowerCase();

  if (
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    (lower.includes('400') && lower.includes('key'))
  ) {
    return {
      message:
        'The configured Gemini API key appears invalid. Please verify GEMINI_API_KEY in Settings > Secrets.',
      code: 'API_KEY_INVALID',
      retryable: false,
      isHighDemand: false,
    };
  }
  if (lower.includes('permission_denied') || lower.includes('403')) {
    return {
      message:
        'Permission denied by Gemini API. Check your API key permissions in Settings > Secrets.',
      code: 'PERMISSION_DENIED',
      retryable: false,
      isHighDemand: false,
    };
  }
  if (
    lower.includes('503') ||
    lower.includes('unavailable') ||
    lower.includes('high demand') ||
    lower.includes('overloaded')
  ) {
    return {
      message:
        'Gemini service is temporarily experiencing high demand (503). Please retry in a few moments.',
      code: 'SERVICE_UNAVAILABLE',
      retryable: true,
      isHighDemand: true,
    };
  }
  if (
    lower.includes('resource_exhausted') ||
    lower.includes('429') ||
    lower.includes('rate limit') ||
    lower.includes('quota')
  ) {
    return {
      message: 'Gemini API rate limit or quota reached. Please wait a moment and retry.',
      code: 'RESOURCE_EXHAUSTED',
      retryable: true,
      isHighDemand: false,
    };
  }
  if (lower.includes('not_found') || lower.includes('404')) {
    return {
      message: `Requested Gemini model (${PRIMARY_MODEL}) was not found or is unavailable.`,
      code: 'MODEL_NOT_FOUND',
      retryable: false,
      isHighDemand: false,
    };
  }
  if (lower.includes('timeout') || lower.includes('aborted')) {
    return {
      message: 'Gemini API request timed out. Please retry the agent execution.',
      code: 'REQUEST_TIMEOUT',
      retryable: true,
      isHighDemand: false,
    };
  }
  return {
    message: rawMessage || 'Unexpected error communicating with Gemini API.',
    code: 'UPSTREAM_ERROR',
    retryable: true,
    isHighDemand: false,
  };
}

export async function generateStructuredJson<T>(options: {
  agentName: string;
  systemInstruction: string;
  prompt: string;
  responseSchema: Schema;
  seed?: number;
}): Promise<T> {
  const client = getGeminiClient();
  const attempts: Array<{ model: string; delayMs: number }> = [
    { model: PRIMARY_MODEL, delayMs: 1200 },
    { model: PRIMARY_MODEL, delayMs: 2000 },
    { model: FALLBACK_MODEL, delayMs: 0 },
  ];

  let lastError: unknown;

  for (let i = 0; i < attempts.length; i++) {
    const { model, delayMs } = attempts[i];
    const startMs = Date.now();
    try {
      const response = await client.models.generateContent({
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

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        throw new AgentExecutionError(
          `${options.agentName} returned an empty response from Gemini.`,
          'EMPTY_RESPONSE',
          true
        );
      }

      const cleaned = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      try {
        const parsed = JSON.parse(cleaned) as T;
        console.log(
          `[Gemini] ${options.agentName} (${model}) completed in ${Date.now() - startMs}ms`
        );
        return parsed;
      } catch {
        throw new AgentExecutionError(
          `${options.agentName} produced malformed JSON output that could not be parsed.`,
          'INVALID_JSON',
          true
        );
      }
    } catch (err) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(
        `[Gemini] ${options.agentName} (${model}) attempt ${i + 1} failed after ${
          Date.now() - startMs
        }ms:`,
        errMsg
      );

      if (err instanceof AgentExecutionError && !err.retryable) {
        throw err;
      }

      const parsed = parseErrorDetails(err);
      const isLast = i === attempts.length - 1;

      if (!parsed.retryable || isLast) {
        if (err instanceof AgentExecutionError) {
          throw err;
        }
        throw new AgentExecutionError(parsed.message, parsed.code, parsed.retryable);
      }

      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new AgentExecutionError(`${options.agentName} failed after retries.`);
}
