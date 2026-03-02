import { ClaudeProvider } from './claude-provider';
import { GeminiProvider } from './gemini-provider';
import type {
  LLMConfig,
  LLMMessage,
  LLMResponse,
  StreamCallbacks,
  LLMProvider,
} from './types';

const DEFAULT_CONFIG: LLMConfig = {
  provider: 'claude',
  model: 'claude-haiku-4-5-20251001',
  temperature: 0,
  maxTokens: 4096,
  timeout: 8000,
};

const GEMINI_CONFIG: Partial<LLMConfig> = {
  provider: 'gemini',
  model: 'gemini-2.0-flash',
};

// Singleton providers — lazy-initialized
let claudeProvider: LLMProvider | null = null;
let geminiProvider: LLMProvider | null = null;

function getClaudeProvider(): LLMProvider {
  if (!claudeProvider) claudeProvider = new ClaudeProvider();
  return claudeProvider;
}

function getGeminiProvider(): LLMProvider | null {
  if (!process.env.GOOGLE_AI_API_KEY) return null;
  if (!geminiProvider) geminiProvider = new GeminiProvider();
  return geminiProvider;
}

function getPrimaryProvider(): LLMProvider {
  const pref = process.env.LLM_PROVIDER || 'claude';
  if (pref === 'gemini') {
    const g = getGeminiProvider();
    if (g) return g;
  }
  return getClaudeProvider();
}

function getFallbackProvider(): LLMProvider | null {
  const pref = process.env.LLM_PROVIDER || 'claude';
  // Fallback is the opposite of primary
  if (pref === 'gemini') return getClaudeProvider();
  return getGeminiProvider(); // null if no key
}

function getFallbackConfig(baseConfig: LLMConfig): LLMConfig {
  const pref = process.env.LLM_PROVIDER || 'claude';
  if (pref === 'gemini') {
    return { ...baseConfig, provider: 'claude', model: 'claude-haiku-4-5-20251001' };
  }
  return { ...baseConfig, ...GEMINI_CONFIG } as LLMConfig;
}

export async function generateLLM(
  messages: LLMMessage[],
  config?: Partial<LLMConfig>
): Promise<LLMResponse> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config, temperature: 0 };
  const primary = getPrimaryProvider();

  // Single attempt on primary → immediate fallback on failure (no retry delay)
  try {
    return await withTimeout(
      primary.generate(messages, mergedConfig),
      mergedConfig.timeout
    );
  } catch (primaryErr) {
    console.warn(`[LLM] Primary (${mergedConfig.provider}) failed:`, primaryErr instanceof Error ? primaryErr.message : primaryErr);

    // Try fallback provider immediately (no delay)
    const fallback = getFallbackProvider();
    if (!fallback) throw primaryErr;

    const fallbackConfig = getFallbackConfig(mergedConfig);
    console.log(`[LLM] Falling back to ${fallbackConfig.provider}/${fallbackConfig.model}`);

    try {
      return await withTimeout(
        fallback.generate(messages, fallbackConfig),
        fallbackConfig.timeout
      );
    } catch (fallbackErr) {
      console.error('[LLM] Fallback also failed:', fallbackErr instanceof Error ? fallbackErr.message : fallbackErr);
      throw primaryErr;
    }
  }
}

export async function streamLLM(
  messages: LLMMessage[],
  callbacks: StreamCallbacks,
  config?: Partial<LLMConfig>
): Promise<void> {
  const mergedConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    temperature: 0,
    maxTokens: config?.maxTokens || 1024,
  };
  const primary = getPrimaryProvider();

  try {
    await primary.stream(messages, mergedConfig, callbacks);
  } catch (primaryErr) {
    console.warn(`[LLM] Stream primary failed:`, primaryErr instanceof Error ? primaryErr.message : primaryErr);

    const fallback = getFallbackProvider();
    if (!fallback) {
      callbacks.onError(primaryErr instanceof Error ? primaryErr : new Error(String(primaryErr)));
      return;
    }

    const fallbackConfig = getFallbackConfig(mergedConfig);
    console.log(`[LLM] Stream falling back to ${fallbackConfig.provider}/${fallbackConfig.model}`);

    try {
      await fallback.stream(messages, fallbackConfig, callbacks);
    } catch (fallbackErr) {
      callbacks.onError(fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr)));
    }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`LLM timeout after ${ms}ms`)), ms)
    ),
  ]);
}

export function isLLMAvailable(): boolean {
  const llmProvider = process.env.LLM_PROVIDER || 'claude';
  if (llmProvider === 'claude') return !!process.env.ANTHROPIC_API_KEY;
  if (llmProvider === 'gemini') return !!process.env.GOOGLE_AI_API_KEY;
  return false;
}
