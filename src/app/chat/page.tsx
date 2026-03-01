'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { trpc } from '@/lib/trpc/client';
import { useChatStore } from '@/stores/useChatStore';
import Sidebar from '@/components/chat/Sidebar';
import MessageBubble from '@/components/chat/MessageBubble';
import ChatInput from '@/components/chat/ChatInput';
import TypingIndicator from '@/components/chat/TypingIndicator';
import { toast } from 'sonner';

interface SidebarUser {
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

  const [sidebarUser, setSidebarUser] = useState<SidebarUser | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAssembling, setIsAssembling] = useState(true);
  const [firstMessageId, setFirstMessageId] = useState<string | null>(null);

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
  } = useChatStore();

  const assembleMutation = trpc.report.assemble.useMutation();
  const submitMutation = trpc.report.submit.useMutation();

  // Auto-scroll to bottom on new messages or streaming
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming, isAssembling]);

  // Initialize: fetch user, set scenario, assemble report
  useEffect(() => {
    let cancelled = false;

    async function init() {
      resetChat();
      setActiveScenario(scenarioId);
      setIsAssembling(true);

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

      // Build sidebar user from user metadata
      const meta = user.user_metadata || {};
      setSidebarUser({
        name: meta.full_name || meta.name || user.email?.split('@')[0] || 'User',
        role: meta.role || 'Employee',
        avatar_initials: getInitials(meta.full_name || meta.name || user.email || 'U'),
        email: user.email || '',
      });

      // Assemble the report
      try {
        const result = await assembleMutation.mutateAsync({ scenarioId });

        if (cancelled) return;

        const assembledReport = result.report;
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
          toast.error('Failed to assemble expense report. Please try again.');
        }
      } finally {
        if (!cancelled) {
          setIsAssembling(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId]);

  // Send message handler
  const handleSend = useCallback(
    async (text: string) => {
      if (!report || hasSubmitted) return;

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
                appendToStream(event.content);
                fullContent += event.content;
              } else if (event.type === 'done') {
                // Parse actions from the full response
                parseAndApplyActions(event.content, fullContent);
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
    (fullResponse: string, _streamedContent: string) => {
      try {
        // Try parsing the full response as JSON (some fallbacks return structured data)
        // Actions may be embedded in the response object
        const parsed =
          typeof fullResponse === 'string'
            ? (() => {
                try {
                  return JSON.parse(fullResponse);
                } catch {
                  return null;
                }
              })()
            : fullResponse;

        if (parsed?.actions && Array.isArray(parsed.actions)) {
          for (const action of parsed.actions) {
            if (action.type === 'update_amount' && action.item_id) {
              updateExpenseItem(action.item_id, {
                amount: Number(action.new_value),
              });
              updateReportTotal();
            }
          }
        }

        if (parsed?.show_submit_button) {
          setShowSubmitButton(true);
        }
      } catch {
        // Non-JSON response text, check for keywords
        const lower = fullResponse.toLowerCase();
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

  // Demo shortcut text for Ctrl+D
  const demoResponse =
    scenarioId === 'mumbai-trip' ? 'Yes, ₹1,100. No receipt.' : undefined;

  return (
    <div className="flex h-screen w-full">
      {/* Left sidebar */}
      <Sidebar user={sidebarUser} onLogout={handleLogout} />

      {/* Main chat area */}
      <div className="ml-[240px] flex flex-1 flex-col">
        {/* Header */}
        <div className="flex h-12 shrink-0 items-center border-b border-gray-200 bg-white px-4">
          <span className="text-sm font-medium text-gray-500"># expense-reports</span>
        </div>

        {/* Message scroll area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto bg-white py-4"
        >
          {messages.map((msg, index) => {
            const isFirstAssistant = msg.id === firstMessageId;

            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                userInitials={sidebarUser?.avatar_initials || 'U'}
              >
                {isFirstAssistant && report ? (
                  <div className="mt-3 space-y-3">
                    {/* Embedded expense table */}
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                            <th className="px-3 py-2">Item</th>
                            <th className="px-3 py-2">Vendor</th>
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2 text-right">Amount</th>
                            <th className="px-3 py-2">Category</th>
                            <th className="px-3 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {report.items.map((item) => (
                            <tr
                              key={item.id}
                              className={
                                item.policy_status === 'flagged'
                                  ? 'bg-amber-50'
                                  : ''
                              }
                            >
                              <td className="px-3 py-2 font-medium text-gray-800">
                                {item.description}
                              </td>
                              <td className="px-3 py-2 text-gray-600">
                                {item.vendor}
                              </td>
                              <td className="px-3 py-2 text-gray-600">
                                {item.date}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-gray-800">
                                {item.currency === 'INR' ? '₹' : item.currency}{' '}
                                {item.amount.toLocaleString('en-IN')}
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                    item.original_category &&
                                    item.original_category !== item.category
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {item.category}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                {item.policy_status === 'auto_approve' && (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                    Auto-approved
                                  </span>
                                )}
                                {item.policy_status === 'flagged' && (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                    Flagged
                                  </span>
                                )}
                                {item.policy_status === 'review' && (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600">
                                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                    Review
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                            <td className="px-3 py-2" colSpan={3}>
                              Total
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {report.currency === 'INR' ? '₹' : report.currency}{' '}
                              {report.total_amount.toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-2" colSpan={2} />
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Dinner reasoning — PRE-EXPANDED */}
                    {report.flagged_items.length > 0 && (
                      <div className="space-y-2">
                        {report.flagged_items.map((item) => (
                          <div
                            key={`reasoning-${item.id}`}
                            className="rounded-lg border border-amber-200 bg-amber-50 p-3"
                          >
                            <div className="mb-1 flex items-center gap-2">
                              <span className="text-sm font-semibold text-amber-800">
                                Reasoning: {item.description}
                              </span>
                              {item.flag_reason && (
                                <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-800">
                                  {item.flag_reason}
                                </span>
                              )}
                            </div>
                            <p className="text-sm leading-relaxed text-amber-900">
                              {item.reasoning}
                            </p>
                            {item.recommendation && (
                              <p className="mt-1 text-xs text-amber-700">
                                <strong>Recommendation:</strong>{' '}
                                {item.recommendation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Items with re-categorization reasoning (non-flagged) */}
                    {report.items
                      .filter(
                        (item) =>
                          item.original_category &&
                          item.original_category !== item.category &&
                          item.policy_status !== 'flagged',
                      )
                      .map((item) => (
                        <div
                          key={`recat-${item.id}`}
                          className="rounded-lg border border-blue-200 bg-blue-50 p-3"
                        >
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-sm font-semibold text-blue-800">
                              Re-categorized: {item.description}
                            </span>
                            <span className="rounded bg-blue-200 px-1.5 py-0.5 text-[10px] font-medium text-blue-800">
                              {item.original_category} → {item.category}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed text-blue-900">
                            {item.reasoning}
                          </p>
                        </div>
                      ))}
                  </div>
                ) : null}
              </MessageBubble>
            );
          })}

          {/* Typing indicator during assembly or streaming */}
          {(isAssembling || isStreaming) && <TypingIndicator />}

          {/* Submit button */}
          {showSubmitButton && !hasSubmitted && (
            <div className="flex justify-center px-4 py-3">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="rounded-lg bg-[#1F8844] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#186d36] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
              </button>
            </div>
          )}
        </div>

        {/* Chat input — fixed at bottom */}
        <ChatInput
          onSend={handleSend}
          disabled={isAssembling || isStreaming || hasSubmitted}
          demoResponse={demoResponse}
          value={inputText}
          onChange={setInputText}
        />
      </div>
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
  items: Array<{ description: string }>;
  missing_items: Array<{
    detected_gap: string;
    estimated_amount: number;
    currency: string;
    action_needed: string;
  }>;
  summary: {
    total_items: number;
    auto_approve_count: number;
    review_count: number;
    missing_count: number;
  };
}): string {
  const parts: string[] = [];

  parts.push(
    `<p>Hi <strong>${report.traveler}</strong>, I've assembled your expense report for <strong>${report.trip_summary}</strong>.</p>`,
  );

  parts.push(
    `<p>I found <strong>${report.summary.total_items} expenses</strong> — ` +
      `<strong>${report.summary.auto_approve_count}</strong> auto-approved, ` +
      `<strong>${report.summary.review_count}</strong> need review` +
      (report.summary.missing_count > 0
        ? `, and <strong>${report.summary.missing_count}</strong> potential missing item${report.summary.missing_count > 1 ? 's' : ''}`
        : '') +
      '.</p>',
  );

  // Gap question for missing items (e.g., taxi)
  if (report.missing_items.length > 0) {
    const gap = report.missing_items[0];
    parts.push(
      `<p style="margin-top:8px; padding:8px 12px; background:#FEF3C7; border-radius:8px; border-left:3px solid #F59E0B;">` +
        `<strong>Detected gap:</strong> ${gap.detected_gap}<br/>` +
        `Estimated amount: <strong>${gap.currency === 'INR' ? '₹' : gap.currency} ${gap.estimated_amount.toLocaleString('en-IN')}</strong><br/>` +
        `${gap.action_needed}</p>`,
    );
  }

  return parts.join('');
}
