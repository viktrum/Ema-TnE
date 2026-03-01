import Anthropic from '@anthropic-ai/sdk';
import type {
  LLMConfig,
  LLMMessage,
  LLMResponse,
  LLMProvider,
  StreamCallbacks,
} from './types';

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

export class ClaudeProvider implements LLMProvider {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic();
  }

  async generate(
    messages: LLMMessage[],
    config: LLMConfig
  ): Promise<LLMResponse> {
    const { systemMessage, userMessages } = this.splitMessages(messages);
    const model = config.model || DEFAULT_MODEL;
    const start = Date.now();

    const response = await this.client.messages.create({
      model,
      max_tokens: config.maxTokens,
      temperature: 0,
      ...(systemMessage ? { system: systemMessage } : {}),
      messages: userMessages,
    });

    const latencyMs = Date.now() - start;

    const content = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return {
      content,
      model: response.model,
      tokensIn: response.usage.input_tokens,
      tokensOut: response.usage.output_tokens,
      latencyMs,
      finishReason: response.stop_reason ?? 'unknown',
    };
  }

  async stream(
    messages: LLMMessage[],
    config: LLMConfig,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const { systemMessage, userMessages } = this.splitMessages(messages);
    const model = config.model || DEFAULT_MODEL;
    const start = Date.now();

    let fullContent = '';
    let tokensIn = 0;
    let tokensOut = 0;
    let finishReason = 'unknown';

    try {
      const stream = this.client.messages.stream({
        model,
        max_tokens: config.maxTokens,
        temperature: 0,
        ...(systemMessage ? { system: systemMessage } : {}),
        messages: userMessages,
      });

      stream.on('text', (text) => {
        fullContent += text;
        callbacks.onToken(text);
      });

      const finalMessage = await stream.finalMessage();

      tokensIn = finalMessage.usage.input_tokens;
      tokensOut = finalMessage.usage.output_tokens;
      finishReason = finalMessage.stop_reason ?? 'unknown';

      const latencyMs = Date.now() - start;

      callbacks.onComplete({
        content: fullContent,
        model: finalMessage.model,
        tokensIn,
        tokensOut,
        latencyMs,
        finishReason,
      });
    } catch (error) {
      callbacks.onError(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  private splitMessages(messages: LLMMessage[]): {
    systemMessage: string | undefined;
    userMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  } {
    let systemMessage: string | undefined;
    const userMessages: Array<{
      role: 'user' | 'assistant';
      content: string;
    }> = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemMessage = msg.content;
      } else {
        userMessages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    return { systemMessage, userMessages };
  }
}
