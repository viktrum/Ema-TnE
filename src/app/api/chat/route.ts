import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamLLM, isLLMAvailable } from "@/lib/llm/client";
import { buildChatMessages } from "@/lib/llm/prompts/chat";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const { message, scenarioId, report, history } = body;

  if (!message || !scenarioId) {
    return new Response("Missing required fields: message, scenarioId", { status: 400 });
  }

  // Save user message to chat_messages
  await supabase.from("chat_messages").insert({
    user_id: user.id,
    scenario_id: scenarioId,
    role: "user",
    content: message,
  });

  // Check fallback
  const useFallback =
    process.env.FALLBACK_MODE === "true" || !isLLMAvailable();

  if (useFallback) {
    return handleFallback(
      supabase,
      message,
      scenarioId,
      history?.length || 0,
      user.id
    );
  }

  // Build messages for LLM
  const messages = buildChatMessages(
    report,
    history || [],
    message,
    body.scenarioContext
  );

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = "";

      await streamLLM(
        messages,
        {
          onToken(token: string) {
            fullResponse += token;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "token", content: token })}\n\n`
              )
            );
          },
          async onComplete(response: { latencyMs: number }) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "done", content: fullResponse, latencyMs: response.latencyMs })}\n\n`
              )
            );
            controller.close();

            // Save assistant message
            await supabase.from("chat_messages").insert({
              user_id: user.id,
              scenario_id: scenarioId,
              role: "assistant",
              content: fullResponse,
            });
          },
          onError(error: Error) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "error", content: error.message })}\n\n`
              )
            );
            controller.close();
          },
        },
        { maxTokens: 1024 }
      );
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// Fallback handler with fake streaming
async function handleFallback(
  supabase: SupabaseClient,
  message: string,
  scenarioId: string,
  historyLength: number,
  userId: string,
) {
  const fallbackKey = matchFallback(message, historyLength);
  const fallbackId = fallbackKey ? `${scenarioId}/${fallbackKey}` : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fallbackData: Record<string, any> | null = null;
  if (fallbackId) {
    const { data } = await supabase
      .from("fallbacks")
      .select("*")
      .eq("id", fallbackId)
      .single();
    fallbackData = data;
  }

  if (!fallbackData) {
    // Universal fallback
    fallbackData = {
      text: "Let me focus on your expense report. Everything looks good with the items I've assembled. Would you like to review the details or submit?",
      response: {
        response:
          "Let me focus on your expense report. Everything looks good with the items I've assembled. Would you like to review the details or submit?",
        actions: [],
        report_updated: false,
        show_submit_button: true,
        needs_categorization: false,
      },
    };
  }

  const text =
    fallbackData.text || fallbackData.response?.response || "";
  const words = text.split(" ");
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      for (const word of words) {
        const jitter = 15 + Math.random() * 25; // 15-40ms
        await new Promise((r) => setTimeout(r, jitter));
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "token", content: word + " " })}\n\n`
          )
        );
      }
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "done", content: text, fallback: true })}\n\n`
        )
      );
      controller.close();

      // Save to chat_messages
      await supabase.from("chat_messages").insert({
        user_id: userId,
        scenario_id: scenarioId,
        role: "assistant",
        content: text,
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function matchFallback(msg: string, historyLength: number): string | null {
  if (historyLength === 0 || msg === "__INITIAL__") return "chat-initial";

  const m = msg.toLowerCase().trim();

  if (
    m.match(/\b(1[,.]?100|taxi|cab|uber|ola|ride)\b/) &&
    m.match(/\b(actual|correct|was|change|update|yes|yeah|yep|no receipt)\b/i)
  ) {
    return "chat-confirm-taxi";
  }

  if (
    m.match(
      /\b(submit|confirm|send|done|looks good|yes|approve|go ahead)\b/
    ) &&
    m.length < 50
  ) {
    return "chat-submit";
  }

  if (
    m.match(/\b(why|how|reason|explain)\b/) &&
    m.match(/\b(categor|dinner|client|re-?categor|changed?|moved?)\b/)
  ) {
    return "chat-why-category";
  }

  if (m.match(/\b(policy|limit|maximum|max|rules?|allowed?|budget)\b/)) {
    return "chat-policy-question";
  }

  return null;
}
