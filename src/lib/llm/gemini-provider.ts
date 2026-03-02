import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  LLMConfig,
  LLMMessage,
  LLMResponse,
  LLMProvider,
  StreamCallbacks,
} from './types';

const DEFAULT_MODEL = 'gemini-2.0-flash';

export class GeminiProvider implements LLMProvider {
  private client: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_AI_API_KEY is not set');
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async generate(
    messages: LLMMessage[],
    config: LLMConfig
  ): Promise<LLMResponse> {
    const { systemInstruction, contents } = this.convertMessages(messages);
    const model = this.client.getGenerativeModel({
      model: config.model || DEFAULT_MODEL,
      ...(systemInstruction ? { systemInstruction } : {}),
      generationConfig: {
        temperature: 0,
        maxOutputTokens: config.maxTokens,
      },
    });

    const start = Date.now();
    const result = await model.generateContent({ contents });
    const latencyMs = Date.now() - start;

    const response = result.response;
    const content = response.text();
    const usage = response.usageMetadata;

    return {
      content,
      model: config.model || DEFAULT_MODEL,
      tokensIn: usage?.promptTokenCount ?? 0,
      tokensOut: usage?.candidatesTokenCount ?? 0,
      latencyMs,
      finishReason: response.candidates?.[0]?.finishReason ?? 'unknown',
    };
  }

  async stream(
    messages: LLMMessage[],
    config: LLMConfig,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const { systemInstruction, contents } = this.convertMessages(messages);
    const model = this.client.getGenerativeModel({
      model: config.model || DEFAULT_MODEL,
      ...(systemInstruction ? { systemInstruction } : {}),
      generationConfig: {
        temperature: 0,
        maxOutputTokens: config.maxTokens,
      },
    });

    const start = Date.now();
    let fullContent = '';

    try {
      const result = await model.generateContentStream({ contents });

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          fullContent += text;
          callbacks.onToken(text);
        }
      }

      const response = await result.response;
      const usage = response.usageMetadata;
      const latencyMs = Date.now() - start;

      callbacks.onComplete({
        content: fullContent,
        model: config.model || DEFAULT_MODEL,
        tokensIn: usage?.promptTokenCount ?? 0,
        tokensOut: usage?.candidatesTokenCount ?? 0,
        latencyMs,
        finishReason: response.candidates?.[0]?.finishReason ?? 'unknown',
      });
    } catch (error) {
      callbacks.onError(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  private convertMessages(messages: LLMMessage[]): {
    systemInstruction: string | undefined;
    contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  } {
    let systemInstruction: string | undefined;
    const contents: Array<{
      role: 'user' | 'model';
      parts: Array<{ text: string }>;
    }> = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction = msg.content;
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }

    return { systemInstruction, contents };
  }
}
