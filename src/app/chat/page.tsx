'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { trpc } from '@/lib/trpc/client';
import { useChatStore } from '@/stores/useChatStore';
import MessageBubble from '@/components/chat/MessageBubble';
import ChatInput from '@/components/chat/ChatInput';
import TypingIndicator from '@/components/chat/TypingIndicator';
import AssemblyProgress from '@/components/chat/AssemblyProgress';
import BeforeSplash from '@/components/chat/BeforeSplash';
import ExpenseReportCard from '@/components/chat/ExpenseReportCard';
import { toast } from 'sonner';
import { extractChatResponse } from '@/lib/utils/parseLLMResponse';
import { LogOut, CheckCircle, Loader2 } from 'lucide-react';

interface ChatUser {
  name: string;
  role: string;
  avatar_initials: string;
  email: string;
}

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenarioId = searchParams.get('scenario') || 'mumbai-trip';

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [chatUser, setChatUser] = useState<ChatUser | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [firstMessageId, setFirstMessageId] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  const {
    messages,
    report,
    isStreaming,
    inputText,
    hasSubmitted,
    showSubmitButton,
    isSubmitting,
    setReport,
    addMessage,
    updateMessage,
    appendToStream,
    setStreaming,
    setInputText,
    setShowSubmitButton,
    setSubmitting,
    setHasSubmitted,
    setActiveScenario,
    updateExpenseItem,
    updateReportTotal,
    resetChat,
    loadingSteps,
    isAssemblyLoading,
    setAssemblyLoading,
    updateLoadingStep,
    showBeforeSplash,
    setShowBeforeSplash,
  } = useChatStore();

  const assembleMutation = trpc.report.assemble.useMutation();
  const submitMutation = trpc.report.submit.useMutation();
  const reCategorize = trpc.categorize.reCategorize.useMutation();

  // Edit flows state
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingAmountId, setEditingAmountId] = useState<string | null>(null);
  const [nudge, setNudge] = useState<{ itemId: string; aiCategory: string; aiReasoning: string } | null>(null);

  // Auto-scroll to bottom on new messages or streaming
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isStreaming, isAssemblyLoading]);

  // Initialize: fetch user, set scenario, assemble report
  useEffect(() => {
    let cancelled = false;

    async function init() {
      resetChat();
      setActiveScenario(scenarioId);
      setAssemblyLoading(true);

      // Get current user
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        toast.error('Please log in to continue.');
        router.push('/login');
        return;
      }

      if (cancelled) return;

      setUserId(user.id);

      // Build chat user from user metadata
      const meta = user.user_metadata || {};
      setChatUser({
        name: meta.full_name || meta.name || user.email?.split('@')[0] || 'User',
        role: meta.role || 'Employee',
        avatar_initials: getInitials(meta.full_name || meta.name || user.email || 'U'),
        email: user.email || '',
      });

      // Assemble the report with progress steps
      const stepDelays = [0, 400, 900, 1500, 2200];
      const stepTimers: ReturnType<typeof setTimeout>[] = [];
      stepDelays.forEach((delay, i) => {
        stepTimers.push(setTimeout(() => {
          if (i > 0) updateLoadingStep(i - 1, 'done');
          updateLoadingStep(i, 'active');
        }, delay));
      });

      try {
        const result = await assembleMutation.mutateAsync({ scenarioId });

        if (cancelled) return;

        // Mark all steps done
        for (let i = 0; i < 5; i++) updateLoadingStep(i, 'done');

        const assembledReport = result.report;
        if (result._fallback) setUsedFallback(true);
        setReport(assembledReport);

        // Build the initial AI message with expense table HTML and gap question
        const initialContent = buildInitialMessage(assembledReport);
        const msgId = generateId();
        setFirstMessageId(msgId);

        addMessage({
          id: msgId,
          role: 'assistant',
          content: initialContent,
          timestamp: Date.now(),
        });
      } catch (err) {
        if (!cancelled) {
          toast.error('Failed to assemble expense report.', {
            description: err instanceof Error ? err.message : String(err),
          });
        }
      } finally {
        stepTimers.forEach(clearTimeout);
        if (!cancelled) {
          setAssemblyLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId]);

  // Realtime: listen for Ema notifications (approval/reject/ask from manager)
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel('chat-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const msg = payload.new as any;
          if (msg.role !== 'assistant') return;

          // Only process notification messages from the approval router.
          // Regular chat messages (saved by /api/chat SSE route) are already
          // displayed via streaming — we must NOT re-add them here.
          // Notifications have message_type='notification' (set by approval router).
          if (msg.message_type !== 'notification') return;

          addMessage({
            id: msg.id,
            role: 'assistant',
            content: msg.content,
            timestamp: new Date(msg.created_at).getTime(),
          });
          toast('New update from Ema');
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Send message handler
  const handleSend = useCallback(
    async (text: string) => {
      if (!report) return;

      setInputText('');

      // Add user message
      const userMsgId = generateId();
      addMessage({
        id: userMsgId,
        role: 'user',
        content: text,
        timestamp: Date.now(),
      });

      // Create assistant message placeholder
      const assistantMsgId = generateId();
      addMessage({
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      });
      setStreaming(true, assistantMsgId);

      // Abort any previous stream
      if (abortRef.current) {
        abortRef.current.abort();
      }
      abortRef.current = new AbortController();

      try {
        const history = messages
          .filter((m) => m.id !== assistantMsgId)
          .map((m) => ({ role: m.role, content: m.content }));

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            scenarioId,
            report,
            history,
          }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`Chat request failed: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';
        let isJsonResponse = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr);

              if (event.type === 'token') {
                fullContent += event.content;
                // Detect JSON response on first non-whitespace character.
                // Once detected, suppress all streaming — content will be
                // set from the parsed response in the "done" handler.
                const trimmed = fullContent.trimStart();
                if (!isJsonResponse && (trimmed.startsWith('{') || trimmed.startsWith('```'))) {
                  isJsonResponse = true;
                }
                if (!isJsonResponse) {
                  appendToStream(event.content);
                }
              } else if (event.type === 'done') {
                if (event.fallback) setUsedFallback(true);
                const finalContent = event.content || fullContent;

                // Try to parse as JSON and extract the response text
                const { response: extractedResponse, parsed: extractedParsed } = extractChatResponse(finalContent);
                let displayContent: string | null = null;
                if (extractedParsed?.response) {
                  displayContent = extractedResponse;
                }
                parseAndApplyActions(finalContent, fullContent);

                if (displayContent) {
                  // JSON response: replace whatever is in the message with
                  // just the human-readable text.
                  updateMessage(assistantMsgId, displayContent);
                } else if (isJsonResponse) {
                  // Started with { but failed to parse or had no .response —
                  // show the raw content so the user sees something.
                  updateMessage(assistantMsgId, fullContent);
                }
                // else: plain text was already streamed via appendToStream
              } else if (event.type === 'error') {
                toast.error(event.content || 'An error occurred.');
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        toast.error('Failed to send message. Please try again.');
        // Remove the empty assistant message on error
        updateMessage(assistantMsgId, '_Error: could not get a response._');
      } finally {
        setStreaming(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [report, messages, scenarioId, hasSubmitted],
  );

  // Parse SSE response for embedded actions
  const parseAndApplyActions = useCallback(
    (fullResponse: string, streamedContent: string) => {
      try {
        const { parsed } = extractChatResponse(fullResponse);

        if (parsed?.actions && Array.isArray(parsed.actions)) {
          for (const action of parsed.actions) {
            if (action.type === 'update_amount' && action.item_id) {
              const rawAmount = String(action.new_value).replace(/[^0-9.]/g, '');
              updateExpenseItem(action.item_id, {
                amount: Number(rawAmount) || 0,
              });
              updateReportTotal();
            } else if (action.type === 'update_category' && action.item_id) {
              updateExpenseItem(action.item_id, {
                category: action.new_value,
              });
            } else if (action.type === 'remove_item' && action.item_id) {
              const currentReport = useChatStore.getState().report;
              if (currentReport) {
                const filtered = currentReport.items.filter((i) => i.id !== action.item_id);
                setReport({ ...currentReport, items: filtered });
                updateReportTotal();
              }
            } else if (action.type === 'add_item' && action.new_value) {
              const currentReport = useChatStore.getState().report;
              if (currentReport) {
                const val = typeof action.new_value === 'object' ? action.new_value : {};
                const newItem = {
                  id: `TXN-NEW-${Date.now()}`,
                  description: String(val.description || action.new_value),
                  vendor: String(val.vendor || 'Unknown'),
                  date: String(val.date || ''),
                  amount: Number(val.amount || 0),
                  currency: 'INR',
                  category: String(val.category || 'Uncategorized'),
                  original_category: null,
                  confidence: 85,
                  sources: ['Employee'] as string[],
                  reasoning: 'Added by employee during chat review',
                  policy_status: 'pending_review' as const,
                  flag_reason: null,
                  recommendation: 'auto_approve' as const,
                };
                setReport({ ...currentReport, items: [...currentReport.items, newItem] });
                updateReportTotal();
              }
            }
          }
        }

        if (parsed?.show_submit_button) {
          setShowSubmitButton(true);
        }

        if (parsed?.submitted) {
          setHasSubmitted(true);
        }
      } catch {
        // Non-JSON response text, check for keywords
        const lower = (fullResponse || streamedContent).toLowerCase();
        if (
          lower.includes('submit') &&
          (lower.includes('ready') || lower.includes('confirm') || lower.includes('go ahead'))
        ) {
          setShowSubmitButton(true);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Submit report
  const handleSubmit = useCallback(async () => {
    if (!report) return;

    setSubmitting(true);
    try {
      await submitMutation.mutateAsync({ reportId: report.id });
      setHasSubmitted(true);
      setShowSubmitButton(false);

      addMessage({
        id: generateId(),
        role: 'assistant',
        content:
          '<p><strong>Report submitted.</strong> Routing to <strong>Mihir</strong> for review.</p>',
        timestamp: Date.now(),
      });

      toast.success('Expense report submitted successfully.');
    } catch {
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report]);

  // Logout handler
  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }, [router]);

  const handleDismissSplash = useCallback(() => setShowBeforeSplash(false), [setShowBeforeSplash]);

  // Demo shortcut text for Ctrl+D — scenario-aware
  const DEMO_RESPONSES: Record<string, string> = {
    'mumbai-trip': 'Yes, ₹1,100. No receipt.',
    'bangalore-trip': 'Yes, the team lunch was pre-approved as part of the offsite budget. All 8 attendees were engineering team members.',
    'london-trip': 'Yes, the Heathrow Express was £25. I have the receipt.',
  };
  const demoResponse = DEMO_RESPONSES[scenarioId];

  // Handle category change with AI nudge
  async function handleCategoryChange(itemId: string, currentCategory: string, newCategory: string) {
    if (newCategory === currentCategory) return;
    setEditingCategoryId(null);

    const item = report?.items.find(i => i.id === itemId);
    if (!item) return;

    updateExpenseItem(itemId, { category: newCategory });

    try {
      const result = await reCategorize.mutateAsync({
        itemId,
        itemDescription: item.description,
        itemAmount: item.amount,
        currentCategory,
        newCategory,
        scenarioId,
      });

      updateExpenseItem(itemId, {
        confidence: result.confidence,
        reasoning: result.reasoning,
        policy_status: result.policy_status as 'within_policy' | 'within_policy_after_recategorization' | 'exceeds_policy' | 'pending_review',
      });

      if (!result.accepted && result.ai_suggestion) {
        setNudge({
          itemId,
          aiCategory: result.ai_suggestion.category,
          aiReasoning: result.ai_suggestion.reasoning,
        });
      }
    } catch {
      updateExpenseItem(itemId, { category: currentCategory });
      toast.error('Failed to update category');
    }
  }

  // Phase 4: Handle inline amount edit
  function handleAmountChange(itemId: string, rawValue: string) {
    setEditingAmountId(null);
    const newAmount = Number(rawValue.replace(/[^0-9.]/g, ''));
    if (isNaN(newAmount) || newAmount <= 0) return;

    const item = report?.items.find(i => i.id === itemId);
    if (!item || item.amount === newAmount) return;

    updateExpenseItem(itemId, { amount: newAmount });
    updateReportTotal();
  }

  // Shortened trip label for header pill
  const tripLabel = report?.trip_summary?.split(',')[0]?.trim() || scenarioId.replace(/-/g, ' ');

  return (
    <div className="flex h-screen w-full flex-col bg-[#F9FAFB]">
      {showBeforeSplash && (
        <BeforeSplash onDismiss={handleDismissSplash} />
      )}

      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
        <div className="flex items-center gap-3">
          {/* Ema logo */}
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F8844] text-sm font-bold text-white">
            E
          </div>
          <span className="text-sm font-semibold text-gray-900">Ema T&amp;E</span>
          {/* Trip pill */}
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium capitalize text-gray-500">
            {tripLabel}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Fallback/Live status */}
          {process.env.NODE_ENV === 'development' && !isAssemblyLoading && report && (
            <span className={`rounded px-2 py-0.5 text-[10px] font-mono ${
              usedFallback ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
            }`}>
              {usedFallback ? 'FALLBACK' : 'LIVE LLM'}
            </span>
          )}

          {/* Submit status */}
          {hasSubmitted && (
            <span className="flex items-center gap-1 text-[12px] text-green-600">
              <CheckCircle className="h-3.5 w-3.5" />
              Submitted
            </span>
          )}

          {/* User name */}
          {chatUser && (
            <span className="text-[12px] text-gray-500">{chatUser.name}</span>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Message scroll area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-6"
      >
        <div className="mx-auto max-w-3xl space-y-1">
          {messages.map((msg) => {
            const isFirstAssistant = msg.id === firstMessageId;

            return (
              <MessageBubble
                key={msg.id}
                message={msg}
              >
                {isFirstAssistant && report ? (
                  <ExpenseReportCard
                    report={report}
                    editingCategoryId={editingCategoryId}
                    editingAmountId={editingAmountId}
                    onEditCategory={(id) => setEditingCategoryId(id)}
                    onCategoryChange={handleCategoryChange}
                    onCancelEditCategory={() => setEditingCategoryId(null)}
                    onEditAmount={(id) => setEditingAmountId(id)}
                    onAmountChange={handleAmountChange}
                    onCancelEditAmount={() => setEditingAmountId(null)}
                    nudge={nudge}
                    onAcceptNudge={() => {
                      if (nudge) {
                        updateExpenseItem(nudge.itemId, { category: nudge.aiCategory });
                        setNudge(null);
                      }
                    }}
                    onRejectNudge={() => setNudge(null)}
                  />
                ) : null}
              </MessageBubble>
            );
          })}

          {/* Progress steps during assembly, typing dots during streaming */}
          {isAssemblyLoading && <AssemblyProgress steps={loadingSteps} />}
          {isStreaming && !isAssemblyLoading && <TypingIndicator />}

          {/* Submit button */}
          {showSubmitButton && !hasSubmitted && (
            <div className="flex justify-center px-4 py-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-2xl bg-[#1F8844] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-[#1F8844]/20 transition-all hover:bg-[#186d36] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Confirm &amp; Submit
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chat input — fixed at bottom */}
      <ChatInput
        onSend={handleSend}
        disabled={isAssemblyLoading || isStreaming}
        demoResponse={demoResponse}
        value={inputText}
        onChange={setInputText}
      />
    </div>
  );
}

// --- Helpers ---

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function buildInitialMessage(report: {
  traveler: string;
  trip_summary: string;
  items: { recommendation: string; original_category: string | null; flag_reason: string | null }[];
  flagged_items: { id: string }[];
  missing_items: { id: string }[];
  summary: {
    total_items: number;
    auto_approve_count: number;
  };
}): string {
  const firstName = report.traveler.split(' ')[0];
  const destination = report.trip_summary?.split(',')[0]?.trim() || 'your trip';

  // Count attention items: flagged or recategorized (excluding gap items) + missing items
  const flaggedIds = new Set(report.flagged_items.map((f) => f.id));
  const attentionCount = report.items.filter(
    (item) =>
      item.recommendation !== 'request_employee_input' &&
      (flaggedIds.has((item as any).id) || item.original_category !== null)
  ).length + report.missing_items.length;

  if (attentionCount > 0) {
    return `Hey ${firstName}, welcome back from ${destination}. I've put together your expense report — ${report.summary.total_items} items, ${report.summary.auto_approve_count} auto-approved. Just ${attentionCount} thing${attentionCount > 1 ? 's' : ''} need${attentionCount === 1 ? 's' : ''} your input.`;
  }

  return `Hey ${firstName}, welcome back from ${destination}. I've put together your expense report — ${report.summary.total_items} items, ${report.summary.auto_approve_count} auto-approved. Take a look.`;
}
