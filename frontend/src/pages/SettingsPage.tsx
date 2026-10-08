import React, { useEffect, useState } from 'react';
import { Cpu, ShieldCheck, Key, Database, Server, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [health, setHealth] = useState<{ status: string; openai_configured: boolean; llm_provider: string } | null>(null);

  useEffect(() => {
    async function loadHealth() {
      try {
        const data = await api.getHealth();
        setHealth(data);
      } catch (e) {
        console.error(e);
      }
    }
    loadHealth();
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-slate-100">System Architecture & Settings</h1>
        <p className="text-xs text-slate-400 mt-1">Platform diagnostic parameters and agent engine configuration</p>
      </div>

      <div className="space-y-4">
        {/* LLM Status */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Key className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-slate-200">AI Intelligence Provider</h3>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              health?.openai_configured 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
            }`}>
              {health?.openai_configured ? 'OpenAI GPT-4o Connected' : 'Autonomous Deterministic Engine Active'}
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {health?.openai_configured
              ? 'InsightAI is communicating with the OpenAI LLM endpoint for dynamic NL-to-SQL planning.'
              : 'Autonomous Analytical Fallback Engine is engaged. All natural language queries, aggregations, trend computations, rankings, and Plotly visualizations execute seamlessly with zero API token consumption.'}
          </p>
        </div>

        {/* Safe Execution Sandbox */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-200">Analytical Safety & Sandbox Controls</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Read-only SQL AST Enforcement (Blocks DROP, INSERT, DELETE)</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>DuckDB In-Memory Vectorized Query Sandbox</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Strict Anti-Hallucination Grounding Rule</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Query Execution Timeout & Truncation Safeguard</span>
            </div>
          </div>
        </div>

        {/* User Account Info */}
        {user && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2.5">
              <Server className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-slate-200">Current Session Details</h3>
            </div>
            <div className="text-xs text-slate-300 space-y-1">
              <div><strong>User:</strong> {user.full_name || user.username}</div>
              <div><strong>Email:</strong> {user.email}</div>
              <div><strong>Role:</strong> {user.is_admin ? 'Administrator / Lead Analyst' : 'Data Analyst'}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
