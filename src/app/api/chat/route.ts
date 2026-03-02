import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamLLM, isLLMAvailable } from "@/lib/llm/client";
import { buildChatMessages } from "@/lib/llm/prompts/chat";
import { extractChatResponse } from "@/lib/utils/parseLLMResponse";
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

  if (typeof message === 'string' && message.length > 2000) {
    return new Response("Message too long", { status: 400 });
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

  // Fetch scenario context server-side (don't trust client-sent data)
  let scenarioContext: unknown = null;
  const { data: scenarioData } = await supabase
    .from("scenarios")
    .select("context")
    .eq("id", scenarioId)
    .single();
  if (scenarioData?.context) {
    scenarioContext = scenarioData.context;
  }

  // Build messages for LLM
  const messages = buildChatMessages(
    report,
    history || [],
    message,
    scenarioContext
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

            // Save assistant message — extract readable text if LLM returned JSON
            const { response: extractedText, parsed } = extractChatResponse(fullResponse);
            const saveContent = parsed ? extractedText : fullResponse;

            await supabase.from("chat_messages").insert({
              user_id: user.id,
              scenario_id: scenarioId,
              role: "assistant",
              content: saveContent,
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
    // Universal fallback — scenario-neutral (fires for any scenario with no DB match)
    fallbackData = {
      text: "Let me focus on your expense report. I still need to confirm a few items before we can submit. Let me check what's pending.",
      response: {
        response:
          "Let me focus on your expense report. I still need to confirm a few items before we can submit. Let me check what's pending.",
        actions: [],
        report_updated: false,
        show_submit_button: false,
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
      // Build structured metadata from fallback response
      const responseData = fallbackData.response || {};
      const actions = (responseData.actions || []).map((a: Record<string, unknown>) => {
        // Normalize action types to match our schema
        if (a.type === "update_item" && a.item_id && a.updates) {
          const updates = a.updates as Record<string, unknown>;
          return { type: "update_amount", item_id: a.item_id, new_value: updates.amount, old_value: null };
        }
        if (a.type === "submit_report") return { type: "submit_report" };
        return a;
      });

      // Show submit button after taxi confirmation or submit response
      const isConfirmTaxi = fallbackKey === "chat-confirm-taxi";
      const isSubmit = fallbackKey === "chat-submit";
      const showSubmitButton = isConfirmTaxi || responseData.show_submit_button || false;

      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "done",
            content: JSON.stringify({
              response: text,
              actions,
              report_updated: actions.length > 0,
              show_submit_button: showSubmitButton,
              submitted: isSubmit,
            }),
            fallback: true,
          })}\n\n`
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
