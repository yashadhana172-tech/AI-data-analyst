import React, { useState, useEffect } from 'react';
import { FileText, Download, Sparkles, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';
import { api } from '../services/api';
import { Dataset, ReportItem } from '../types';

interface ReportsPageProps {
  selectedDataset: Dataset | null;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ selectedDataset }) => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [generating, setGenerating] = useState(false);
  const [reportTitle, setReportTitle] = useState('');

  useEffect(() => {
    loadReports();
  }, [selectedDataset]);

  const loadReports = async () => {
    try {
      const data = await api.getReports();
      setReports(data);
      if (data.length > 0 && !selectedReport) {
        setSelectedReport(data[0]);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    }
  };

  const handleGenerate = async () => {
    if (!selectedDataset) return;
    setGenerating(true);

    try {
      const rep = await api.generateReport(
        selectedDataset.id,
        reportTitle || `Executive Analytics Report: ${selectedDataset.name}`
      );
      setReports((prev) => [rep, ...prev]);
      setSelectedReport(rep);
    } catch (err: any) {
      alert(err.message || 'Failed to generate report.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Executive Report Generator</h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated comprehensive analytics dossiers ready for management presentation and stakeholders
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || !selectedDataset}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition disabled:opacity-50"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          <span>{generating ? 'Compiling Analytical Report...' : 'Generate Executive Report'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Reports Archive List */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Generated Archive</div>
          <div className="space-y-1.5">
            {reports.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedReport(r)}
                className={`w-full text-left p-3 rounded-xl text-xs transition space-y-1 ${
                  selectedReport?.id === r.id
                    ? 'bg-slate-800 border border-indigo-500/30 text-indigo-300'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
                }`}
              >
                <div className="font-semibold line-clamp-1">{r.title}</div>
                <div className="text-[10px] text-slate-500">
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              </button>
            ))}
            {reports.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-500">
                No reports compiled yet. Click above to generate.
              </div>
            )}
          </div>
        </div>

        {/* Report Preview */}
        <div className="lg:col-span-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-8 space-y-6 shadow-xl">
          {selectedReport ? (
            <div className="space-y-6">
              {/* Report Header & Download Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-100">{selectedReport.title}</h2>
                  <p className="text-xs text-slate-400">
                    Compiled: {new Date(selectedReport.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={api.getReportPdfUrl(selectedReport.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 text-xs font-semibold transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </a>
                  <a
                    href={api.getReportHtmlUrl(selectedReport.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 text-xs font-semibold transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View HTML</span>
                  </a>
                  <a
                    href={api.getReportMarkdownUrl(selectedReport.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 text-xs font-semibold transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Markdown</span>
                  </a>
                </div>
              </div>

              {/* Render Markdown Content */}
              <div className="prose prose-invert max-w-none text-xs text-slate-300 leading-relaxed font-sans space-y-4">
                <pre className="p-6 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto whitespace-pre-wrap font-sans text-xs text-slate-200">
                  {selectedReport.content_markdown}
                </pre>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500">
              Select or generate a report to inspect.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
