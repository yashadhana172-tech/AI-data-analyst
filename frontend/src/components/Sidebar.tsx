import React from 'react';
import { 
  LayoutDashboard, 
  Database, 
  MessageSquare, 
  BarChart3, 
  FileText, 
  Settings, 
  Cpu, 
  ShieldCheck 
} from 'lucide-react';

export type NavTab = 'dashboard' | 'datasets' | 'chat' | 'visualizations' | 'reports' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  datasetCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, datasetCount }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'chat', label: 'AI Data Analyst', icon: MessageSquare, badge: 'Agentic' },
    { id: 'datasets', label: 'Datasets & Profiling', icon: Database, count: datasetCount },
    { id: 'visualizations', label: 'Visualizations', icon: BarChart3 },
    { id: 'reports', label: 'Executive Reports', icon: FileText },
    { id: 'settings', label: 'Settings & Status', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col justify-between p-4 shrink-0 h-[calc(100vh-4rem)] sticky top-16">
      {/* Navigation Links */}
      <nav className="space-y-1.5">
        <div className="text-[10px] font-semibold tracking-wider uppercase text-slate-500 px-3 py-2">
          Platform Workspace
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id as NavTab)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-indigo-500/20 text-indigo-300">
                  {item.badge}
                </span>
              )}
              {item.count !== undefined && item.count > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] rounded-md bg-slate-800 text-slate-400 font-mono">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Engine Status Footer Card */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>DuckDB Engine</span>
          </div>
          <span className="flex items-center gap-1 text-[10px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-snug">
          Read-only safe execution sandbox enabled with AST SQL validation.
        </p>
        <div className="flex items-center gap-1 text-[10px] text-indigo-300 pt-1 border-t border-slate-800">
          <ShieldCheck className="w-3 h-3 text-indigo-400" />
          <span>Zero Hallucination Grounding</span>
        </div>
      </div>
    </aside>
  );
};
