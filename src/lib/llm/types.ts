export interface LLMConfig {
  provider: 'claude' | 'gemini' | 'openai';
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number; // ms
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  finishReason: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (response: LLMResponse) => void;
  onError: (error: Error) => void;
}

export interface LLMProvider {
  generate(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse>;
  stream(
    messages: LLMMessage[],
    config: LLMConfig,
    callbacks: StreamCallbacks
  ): Promise<void>;
}
