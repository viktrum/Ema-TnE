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
          console.error('Assembly error:', err);
          toast.error('Failed to assemble expense report.', {
            description: err instanceof Error ? err.message : String(err),
          });
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

        if (parsed?.submitted) {
          setHasSubmitted(true);
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
                    {/* Clean expense table */}
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                            <th className="px-3 py-2 w-8">#</th>
                            <th className="px-3 py-2">Description</th>
                            <th className="px-3 py-2 text-right">Amount</th>
                            <th className="px-3 py-2">Category</th>
                            <th className="px-3 py-2 text-center">Confidence</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {report.items.map((item, idx) => {
                            const isDinner = item.original_category !== null;
                            const isGap = item.recommendation === 'request_employee_input';
                            return (
                              <tr
                                key={item.id}
                                className={
                                  isDinner ? 'bg-[#FEF3C7] border-l-[3px] border-l-[#F59E0B]'
                                  : isGap ? 'bg-[#FEF9C3] border-l-[3px] border-l-[#EAB308]'
                                  : 'hover:bg-gray-50'
                                }
                              >
                                <td className="px-3 py-2 text-xs text-gray-400">{idx + 1}</td>
                                <td className="px-3 py-2">
                                  <span className="font-medium text-gray-800">{item.description}</span>
                                  <span className="ml-2 text-xs text-gray-400">{item.date}</span>
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-gray-800">
                                  ₹{item.amount.toLocaleString('en-IN')}
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                    isDinner ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {item.category}
                                  </span>
                                  {isDinner && (
                                    <span className="ml-1 text-[10px] text-gray-400 line-through">{item.original_category}</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                                    item.confidence > 90 ? 'text-green-600' : item.confidence >= 70 ? 'text-amber-600' : 'text-red-600'
                                  }`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${
                                      item.confidence > 90 ? 'bg-green-500' : item.confidence >= 70 ? 'bg-amber-500' : 'bg-red-500'
                                    }`} />
                                    {item.confidence}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-gray-200 bg-gray-50">
                            <td className="px-3 py-2" colSpan={2}>
                              <span className="font-semibold text-gray-700">Total</span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-semibold text-gray-800">
                              ₹{report.total_amount.toLocaleString('en-IN')}
                            </td>
                            <td className="px-3 py-2" colSpan={2} />
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Dinner reasoning — PRE-EXPANDED (single block, not duplicated) */}
                    {report.flagged_items.length > 0 && (
                      <div className="rounded-lg border-l-[3px] border-l-[#F59E0B] bg-[#FEF3C7] p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wide text-amber-700">Why Client Entertainment?</span>
                          <span className="rounded bg-amber-200/60 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                            {report.flagged_items[0].original_category} → {report.flagged_items[0].category}
                          </span>
                        </div>
                        <p className="text-[13px] leading-relaxed text-amber-900">
                          {report.flagged_items[0].reasoning}
                        </p>
                      </div>
                    )}

                    {/* Gap question — taxi */}
                    {report.missing_items.length > 0 && (
                      <div className="rounded-lg border-l-[3px] border-l-[#EAB308] bg-[#FEF9C3] p-3">
                        <p className="text-[13px] text-amber-900">
                          <strong>Gap detected:</strong> {report.missing_items[0].detected_gap}
                          {' '}Estimated ~₹{report.missing_items[0].estimated_amount.toLocaleString('en-IN')}.
                          {' '}Was it a cash taxi? Approximate amount?
                        </p>
                      </div>
                    )}
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
  summary: {
    total_items: number;
    auto_approve_count: number;
  };
}): string {
  const firstName = report.traveler.split(' ')[0];
  return `Hey ${firstName}, welcome back from Mumbai. I've put together your expense report — ${report.summary.total_items} items, ${report.summary.auto_approve_count} auto-approved. Take a look.`;
}
