import React, { useState } from 'react';
import { Terminal, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface SqlViewerProps {
  sql: string;
}

export const SqlViewer: React.FC<SqlViewerProps> = ({ sql }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!sql) return null;

  return (
    <div className="mt-3 border border-slate-800 rounded-lg overflow-hidden bg-slate-950/70 transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span>View Generated SQL Query (DuckDB)</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="relative p-3.5 border-t border-slate-800/80 bg-slate-950 font-mono text-xs text-indigo-300">
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded bg-slate-800/80 text-slate-300 hover:bg-slate-700 transition text-[11px]"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <pre className="overflow-x-auto whitespace-pre-wrap pr-16 leading-relaxed">
            {sql}
          </pre>
        </div>
      )}
    </div>
  );
};
