import React from 'react';
import { Sparkles, Database, UploadCloud, UserCircle, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Dataset } from '../types';

interface NavbarProps {
  datasets: Dataset[];
  selectedDataset: Dataset | null;
  onSelectDataset: (dataset: Dataset) => void;
  onOpenUpload: () => void;
  activeTab: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  datasets,
  selectedDataset,
  onSelectDataset,
  onOpenUpload,
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
      {/* Brand & Context */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-slate-100 tracking-tight">InsightAI</span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md">
                Data Analyst
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Autonomous Analytics Engine</p>
          </div>
        </div>

        {/* Global Dataset Selector */}
        <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-800">
          <Database className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400">Dataset:</span>
          <select
            value={selectedDataset?.id || ''}
            onChange={(e) => {
              const ds = datasets.find((d) => d.id === Number(e.target.value));
              if (ds) onSelectDataset(ds);
            }}
            className="text-xs font-medium bg-slate-900 border border-slate-700/80 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 max-w-xs truncate"
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.row_count.toLocaleString()} rows)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition shadow-md shadow-indigo-600/20"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Upload Dataset</span>
        </button>

        {/* User Badge */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="flex items-center gap-2 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 text-xs text-slate-300">
              <UserCircle className="w-4 h-4 text-indigo-400" />
              <span className="font-medium truncate max-w-[120px]">{user.full_name || user.username}</span>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
