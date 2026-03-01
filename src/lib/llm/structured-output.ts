import { z } from 'zod/v4';
import { generateLLM } from './client';
import type { LLMConfig, LLMMessage } from './types';

export async function generateStructured<T>(
  messages: LLMMessage[],
  schema: z.ZodType<T>,
  config?: Partial<LLMConfig>
): Promise<T> {
  const response = await generateLLM(messages, config);

  try {
    const jsonStr = extractJSON(response.content);
    const parsed = JSON.parse(jsonStr);
    const validated = schema.parse(parsed);
    return validated;
  } catch (err) {
    throw new Error(
      `LLM returned invalid structured output: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

function extractJSON(text: string): string {
  // Try to find JSON in code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  // Try to find raw JSON object/array
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) return jsonMatch[1];

  return text;
}
