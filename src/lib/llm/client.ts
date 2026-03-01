import { ClaudeProvider } from './claude-provider';
import type {
  LLMConfig,
  LLMMessage,
  LLMResponse,
  StreamCallbacks,
  LLMProvider,
} from './types';

const DEFAULT_CONFIG: LLMConfig = {
  provider: 'claude',
  model: 'claude-sonnet-4-20250514',
  temperature: 0,
  maxTokens: 4096,
  timeout: 8000,
};

// Singleton provider
let provider: LLMProvider | null = null;

function getProvider(): LLMProvider {
  if (!provider) {
    const llmProvider = process.env.LLM_PROVIDER || 'claude';
    if (llmProvider === 'claude') {
      provider = new ClaudeProvider();
    } else {
      throw new Error(`Unsupported LLM provider: ${llmProvider}`);
    }
  }
  return provider;
}

export async function generateLLM(
  messages: LLMMessage[],
  config?: Partial<LLMConfig>
): Promise<LLMResponse> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config, temperature: 0 }; // Always 0
  const p = getProvider();

  // Retry logic: 1 retry, 3s delay
  try {
    return await withTimeout(
      p.generate(messages, mergedConfig),
      mergedConfig.timeout
    );
  } catch {
    await delay(3000);
    return await withTimeout(
      p.generate(messages, mergedConfig),
      mergedConfig.timeout
    );
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
  const p = getProvider();

  try {
    await p.stream(messages, mergedConfig, callbacks);
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isLLMAvailable(): boolean {
  const llmProvider = process.env.LLM_PROVIDER || 'claude';
  if (llmProvider === 'claude') return !!process.env.ANTHROPIC_API_KEY;
  // OpenAI provider not yet implemented — return false
  return false;
}
