/**
 * Shared utilities for parsing LLM responses that may be wrapped in
 * markdown code fences (```json ... ```).
 *
 * Used by: src/app/chat/page.tsx, src/app/api/chat/route.ts
 */

/** Strip markdown code fences from LLM output. Non-anchored so it handles leading text. */
export function stripJsonFences(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenceMatch ? fenceMatch[1].trim() : text.trim();
}

/** Parse an LLM response string, stripping fences and extracting the human-readable `response` field. */
export function extractChatResponse(raw: string): { response: string; parsed: Record<string, unknown> | null } {
  const cleaned = stripJsonFences(raw);
  try {
    const parsed = JSON.parse(cleaned);
    return { response: parsed?.response || cleaned, parsed };
  } catch {
    return { response: cleaned, parsed: null };
  }
}
