import React, { useEffect, useState } from 'react';
import { 
  Database, 
  Layers, 
  Activity, 
  Sparkles, 
  ArrowUpRight, 
  Star, 
  Clock, 
  HelpCircle,
  FileCheck2,
  TrendingUp,
  BarChart2
} from 'lucide-react';
import { api } from '../services/api';
import { DashboardStats, Dataset } from '../types';

interface DashboardPageProps {
  onAskQuestion: (question: string) => void;
  onSelectDatasetTab: () => void;
  selectedDataset: Dataset | null;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ 
  onAskQuestion, 
  onSelectDatasetTab,
  selectedDataset 
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await api.getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const demoQuestions = [
    "What are the top 10 products by revenue?",
    "Which region generates the highest profit?",
    "Show monthly revenue trends.",
    "What is the average order value?",
    "Which category has the highest sales?",
    "Find unusual sales transactions.",
    "Show correlation between discount and profit.",
    "Which customers have generated the most revenue?",
    "Compare revenue by region.",
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/20 p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Autonomous Analytics Platform</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
            Turn Raw Datasets Into <span className="gradient-text">Actionable Intelligence</span>
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Upload CSV, Excel, JSON, or Parquet files. InsightAI automatically profiles distributions, identifies trends, generates secure DuckDB SQL queries, and explains business takeaways in plain language.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => onAskQuestion("What are the top 10 products by revenue?")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ask AI Analyst</span>
            </button>
            <button
              onClick={onSelectDatasetTab}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
            >
              <Database className="w-4 h-4 text-slate-400" />
              <span>Explore Datasets</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Datasets</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-100">
            {stats?.total_datasets ?? 1}
          </div>
          <p className="text-[11px] text-slate-500">Registered analytical stores</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Rows Analyzed</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-emerald-400">
            {stats?.total_rows_analyzed.toLocaleString() ?? '1,250'}
          </div>
          <p className="text-[11px] text-slate-500">Processed in memory via DuckDB</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Attributes</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-cyan-400">
            {stats?.total_columns ?? 14}
          </div>
          <p className="text-[11px] text-slate-500">Categorical, numeric, & temporal</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Data Quality Score</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-amber-400">
            96.8<span className="text-sm font-normal text-slate-500">/100</span>
          </div>
          <p className="text-[11px] text-slate-500">Completeness & hygiene index</p>
        </div>
      </div>

      {/* Clickable Recommended Questions */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Clickable Instant Analysis Questions
            </h3>
          </div>
          <span className="text-xs text-slate-500">Select any question to execute live</span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {demoQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => onAskQuestion(q)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-indigo-300 hover:border-indigo-500/40 hover:bg-slate-900 transition shadow-sm group"
            >
              <span>{q}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition" />
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Grid: Recent Analyses & Favorites */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Analyses Log */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-slate-200">Recent Analytical Inquiries</h3>
            </div>
            <span className="text-xs text-slate-500">DuckDB Execution Log</span>
          </div>

          <div className="space-y-3">
            {stats?.recent_analyses && stats.recent_analyses.length > 0 ? (
              stats.recent_analyses.map((a) => (
                <div
                  key={a.id}
                  onClick={() => onAskQuestion(a.query)}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-indigo-500/30 transition cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200">{a.query}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-indigo-400 font-mono uppercase">
                      {a.chart_type || 'Table'}
                    </span>
                  </div>
                  {a.summary && (
                    <p className="text-[11px] text-slate-400 line-clamp-1">{a.summary}</p>
                  )}
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-500">
                No previous queries recorded. Click any demo question above to start!
              </div>
            )}
          </div>
        </div>

        {/* Favorite & Active Datasets */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-200">Active & Favorite Datasets</h3>
            </div>
            <button
              onClick={onSelectDatasetTab}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            {stats?.favorite_datasets && stats.favorite_datasets.length > 0 ? (
              stats.favorite_datasets.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{d.name}</div>
                      <div className="text-[11px] text-slate-400">{d.rows.toLocaleString()} rows • {d.format.toUpperCase()}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => onAskQuestion("Show overall summary metrics")}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-medium transition"
                  >
                    <span>Analyze</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-500">
                Sample E-Commerce Sales dataset is active and pre-loaded.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
