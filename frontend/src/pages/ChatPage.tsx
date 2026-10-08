import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit2, 
  Terminal, 
  BarChart2, 
  Table, 
  Loader2, 
  CheckCircle2, 
  ArrowUpRight,
  Clock,
  ChevronDown,
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import { Dataset, Conversation, ChatMessage } from '../types';
import { PlotlyChart } from '../components/PlotlyChart';
import { SqlViewer } from '../components/SqlViewer';

interface ChatPageProps {
  selectedDataset: Dataset | null;
  initialQuestion?: string;
  onClearInitialQuestion?: () => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({ 
  selectedDataset, 
  initialQuestion,
  onClearInitialQuestion 
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState<Record<string | number, 'chart' | 'table'>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations list
  useEffect(() => {
    loadConversations();
  }, [selectedDataset]);

  // Handle initial question passed from Dashboard
  useEffect(() => {
    if (initialQuestion && selectedDataset) {
      sendMessage(initialQuestion);
      if (onClearInitialQuestion) onClearInitialQuestion();
    }
  }, [initialQuestion, selectedDataset]);

  const loadConversations = async () => {
    try {
      const convs = await api.getConversations(selectedDataset?.id);
      setConversations(convs);
      if (convs.length > 0 && !activeConvId) {
        selectConversation(convs[0].id);
      } else if (convs.length === 0) {
        setMessages([]);
        setActiveConvId(null);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const selectConversation = async (id: number) => {
    setActiveConvId(id);
    try {
      const conv = await api.getConversation(id);
      if (conv.messages) {
        const parsedMsgs: ChatMessage[] = conv.messages.map((m: any) => {
          let viz = undefined;
          let findings = undefined;
          let tableData = undefined;
          try {
            if (m.chart_config_json) viz = JSON.parse(m.chart_config_json);
            if (m.findings_json) findings = JSON.parse(m.findings_json);
            if (m.execution_result_json) {
              const parsed = JSON.parse(m.execution_result_json);
              tableData = {
                columns: parsed.columns || [],
                rows: parsed.rows || [],
                total_rows: parsed.rows?.length || 0,
              };
            }
          } catch (e) {
            console.error('Parsing message JSON error:', e);
          }

          return {
            id: m.id,
            role: m.role,
            content: m.content,
            answer: findings?.answer || m.content,
            sql_query: m.sql_query,
            key_findings: findings?.key_findings || [],
            business_insights: findings?.business_insights || '',
            recommendations: findings?.recommendations || [],
            limitations: findings?.limitations || '',
            follow_up_questions: findings?.follow_up_questions || [],
            visualization: viz,
            table_data: tableData,
            execution_time_ms: m.execution_time_ms,
            created_at: m.created_at,
          };
        });
        setMessages(parsedMsgs);
      }
    } catch (err) {
      console.error('Failed to load conversation details:', err);
    }
  };

  const handleNewConversation = () => {
    setActiveConvId(null);
    setMessages([]);
  };

  const handleDeleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(id);
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);
      if (activeConvId === id) {
        if (remaining.length > 0) {
          selectConversation(remaining[0].id);
        } else {
          handleNewConversation();
        }
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || !selectedDataset || loading) return;

    const userPrompt = text.trim();
    setInputMessage('');

    // Append user message immediately
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userPrompt,
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const response = await api.sendChat(selectedDataset.id, userPrompt, activeConvId || undefined);

      if (!activeConvId && response.conversation_id) {
        setActiveConvId(response.conversation_id);
        loadConversations();
      }

      setMessages((prev) => [...prev, response]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        error: err.message || 'Failed to process inquiry.',
        content: `Error: ${err.message || 'The analyst could not process this question.'}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const quickPrompts = [
    "What are the top 10 products by revenue?",
    "Which region generates the highest profit?",
    "Show monthly revenue trends.",
    "What is the average order value?",
    "Find unusual sales transactions.",
    "Show correlation between discount and profit."
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-950 overflow-hidden">
      {/* Conversation Sessions Sub-sidebar */}
      <div className="w-64 border-r border-slate-800 bg-slate-950/60 flex flex-col justify-between shrink-0">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Sessions</span>
          <button
            onClick={handleNewConversation}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length > 0 ? (
            conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => selectConversation(c.id)}
                className={`group flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition ${
                  activeConvId === c.id
                    ? 'bg-slate-800/90 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <span className="truncate pr-2 font-medium">{c.title}</span>
                <button
                  onClick={(e) => handleDeleteConversation(c.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center p-6 text-[11px] text-slate-600">
              No previous conversations. Start a new session.
            </div>
          )}
        </div>

        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>Conversational context retained</span>
        </div>
      </div>

      {/* Main Chat Feed */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Ask InsightAI Anything</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Querying against: <span className="font-semibold text-indigo-400">{selectedDataset?.name || 'No Dataset'}</span>
                </p>
              </div>

              {/* Sample Prompts */}
              <div className="w-full space-y-2 pt-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Suggested Prompts</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                  {quickPrompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(p)}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/30 hover:bg-slate-900 text-xs text-slate-300 transition flex items-center justify-between group"
                    >
                      <span className="line-clamp-1">{p}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((m, idx) => (
              <div key={m.id || idx} className="space-y-4 animate-in fade-in duration-150">
                {/* User Message */}
                {m.role === 'user' && (
                  <div className="flex justify-end">
                    <div className="max-w-xl bg-indigo-600 text-white rounded-2xl px-5 py-3 text-sm shadow-lg shadow-indigo-600/20">
                      {m.content}
                    </div>
                  </div>
                )}

                {/* Assistant Message (Structured AI Analyst Card) */}
                {m.role === 'assistant' && (
                  <div className="flex justify-start">
                    <div className="w-full max-w-4xl bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
                      {/* Top Header Badge */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">
                            AI Data Analyst Findings
                          </span>
                        </div>
                        {m.execution_time_ms && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[11px] font-mono text-slate-400">
                            Execution: {m.execution_time_ms} ms
                          </span>
                        )}
                      </div>

                      {/* Answer Section */}
                      {m.answer && (
                        <div className="text-sm font-medium text-slate-100 bg-slate-950/60 p-4 rounded-xl border border-slate-800 leading-relaxed">
                          {m.answer}
                        </div>
                      )}

                      {/* Interactive Visualization or Table Toggle */}
                      {m.visualization && m.visualization.chart_type !== 'none' && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                              <BarChart2 className="w-4 h-4 text-indigo-400" />
                              <span>Data Visualization</span>
                            </div>

                            {m.table_data && (
                              <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                                <button
                                  onClick={() => setActiveResultTab((prev) => ({ ...prev, [m.id]: 'chart' as const }))}
                                  className={`px-2.5 py-1 rounded-md transition ${
                                    (activeResultTab[m.id] || 'chart') === 'chart'
                                      ? 'bg-indigo-600 text-white font-medium'
                                      : 'text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  Chart
                                </button>
                                <button
                                  onClick={() => setActiveResultTab((prev) => ({ ...prev, [m.id]: 'table' as const }))}
                                  className={`px-2.5 py-1 rounded-md transition ${
                                    activeResultTab[m.id] === 'table'
                                      ? 'bg-indigo-600 text-white font-medium'
                                      : 'text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  Table
                                </button>
                              </div>
                            )}
                          </div>

                          {(activeResultTab[m.id] || 'chart') === 'chart' ? (
                            <PlotlyChart config={m.visualization} height={360} />
                          ) : (
                            m.table_data && (
                              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto max-h-72">
                                <table className="w-full text-xs text-left">
                                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-mono uppercase">
                                    <tr>
                                      {m.table_data.columns.map((c) => (
                                        <th key={c} className="py-2 px-3">{c}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                                    {m.table_data.rows.map((row, rIdx) => (
                                      <tr key={rIdx} className="hover:bg-slate-800/40">
                                        {m.table_data!.columns.map((c) => (
                                          <td key={c} className="py-2 px-3">{String(row[c] ?? '')}</td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )
                          )}
                        </div>
                      )}

                      {/* Key Findings */}
                      {m.key_findings && m.key_findings.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                            Key Quantitative Findings
                          </div>
                          <ul className="space-y-1.5">
                            {m.key_findings.map((finding, fIdx) => (
                              <li key={fIdx} className="flex items-start gap-2 text-xs text-slate-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                                <span>{finding}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Business Insights & Recommendations Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                        {m.business_insights && (
                          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-1.5">
                            <div className="text-xs font-semibold uppercase text-indigo-400">Strategic Insights</div>
                            <p className="text-xs text-slate-300 leading-relaxed">{m.business_insights}</p>
                          </div>
                        )}

                        {m.recommendations && m.recommendations.length > 0 && (
                          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-1.5">
                            <div className="text-xs font-semibold uppercase text-emerald-400">Actionable Recommendations</div>
                            <ul className="space-y-1 text-xs text-slate-300">
                              {m.recommendations.map((rec, rIdx) => (
                                <li key={rIdx} className="flex items-start gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Limitations */}
                      {m.limitations && (
                        <div className="text-[11px] text-slate-500 italic">
                          Data Boundary: {m.limitations}
                        </div>
                      )}

                      {/* View SQL Drawer */}
                      {m.sql_query && <SqlViewer sql={m.sql_query} />}

                      {/* Follow-up Questions Chips */}
                      {m.follow_up_questions && m.follow_up_questions.length > 0 && (
                        <div className="pt-2 border-t border-slate-800 space-y-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Suggested Follow-up Drilldowns
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {m.follow_up_questions.map((fq, qIdx) => (
                              <button
                                key={qIdx}
                                onClick={() => sendMessage(fq)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/30 text-xs text-slate-300 transition"
                              >
                                <span>{fq}</span>
                                <ArrowUpRight className="w-3 h-3 text-indigo-400" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 text-xs text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                <span>AI Data Analyst is parsing schema & executing DuckDB analysis...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Area */}
        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(inputMessage);
            }}
            className="max-w-4xl mx-auto flex items-center gap-3"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={`Ask a question about ${selectedDataset?.name || 'the dataset'}... (e.g. 'Show monthly sales trends')`}
              disabled={loading || !selectedDataset}
              className="flex-1 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition"
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim() || !selectedDataset}
              className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
