import React, { useState, useEffect } from 'react';
import { 
  Database, 
  FileText, 
  Trash2, 
  Star, 
  Download, 
  Sparkles, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Activity, 
  Loader2 
} from 'lucide-react';
import { api } from '../services/api';
import { Dataset, DatasetProfile } from '../types';
import { DataCleanerModal } from '../components/DataCleanerModal';

interface DatasetsPageProps {
  datasets: Dataset[];
  selectedDataset: Dataset | null;
  onSelectDataset: (ds: Dataset) => void;
  onRefreshDatasets: () => void;
  onOpenUpload: () => void;
}

export const DatasetsPage: React.FC<DatasetsPageProps> = ({
  datasets,
  selectedDataset,
  onSelectDataset,
  onRefreshDatasets,
  onOpenUpload,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'columns' | 'quality' | 'preview'>('profile');
  const [profile, setProfile] = useState<DatasetProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [cleanerOpen, setCleanerOpen] = useState(false);

  // Preview Pagination
  const [previewData, setPreviewData] = useState<{ columns: string[]; rows: any[]; total_rows: number } | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewPageSize, setPreviewPageSize] = useState(25);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (!selectedDataset) return;
    loadProfile(selectedDataset.id);
    loadPreview(selectedDataset.id, 1, previewPageSize);
  }, [selectedDataset]);

  const loadProfile = async (id: number) => {
    setLoadingProfile(true);
    try {
      const data = await api.getDatasetProfile(id);
      setProfile(data);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadPreview = async (id: number, page: number, size: number) => {
    setLoadingPreview(true);
    try {
      const data = await api.getDatasetPreview(id, page, size);
      setPreviewData(data);
      setPreviewPage(page);
    } catch (err) {
      console.error('Failed to load preview:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleToggleFavorite = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.toggleFavorite(id);
      onRefreshDatasets();
    } catch (err) {
      console.error('Favorite toggle error:', err);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this dataset?')) return;
    try {
      await api.deleteDataset(id);
      onRefreshDatasets();
    } catch (err: any) {
      alert(err.message || 'Cannot delete this dataset.');
    }
  };

  if (!selectedDataset) {
    return (
      <div className="p-12 text-center space-y-4">
        <Database className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="text-base font-semibold text-slate-300">No Dataset Selected</h3>
        <button
          onClick={onOpenUpload}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30"
        >
          Upload Your First Dataset
        </button>
      </div>
    );
  }

  const summary = profile?.summary;
  const colSummaries = profile?.column_summaries || {};
  const corrMatrix = profile?.correlation_matrix || {};

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header with Title and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-100">{selectedDataset.name}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase font-mono">
              {selectedDataset.file_format}
            </span>
            {selectedDataset.is_cleaned && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                Cleaned
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Original: {selectedDataset.original_filename} • {(selectedDataset.file_size_bytes / 1024 / 1024).toFixed(2)} MB • {selectedDataset.row_count.toLocaleString()} rows • {selectedDataset.column_count} columns
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setCleanerOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-500/30 transition shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Data Cleaning Studio</span>
          </button>
          <a
            href={api.getDatasetDownloadUrl(selectedDataset.id)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Raw</span>
          </a>
          <button
            onClick={(e) => handleToggleFavorite(selectedDataset.id, e)}
            className={`p-2 rounded-xl border transition ${
              selectedDataset.is_favorite
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <Star className="w-4 h-4 fill-current" />
          </button>
          <button
            onClick={(e) => handleDelete(selectedDataset.id, e)}
            className="p-2 rounded-xl bg-slate-800 text-rose-400 border border-slate-700 hover:bg-rose-950/40 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6">
        {[
          { id: 'profile', label: 'Dataset Overview & Quality' },
          { id: 'columns', label: 'Column Deep Dive' },
          { id: 'quality', label: 'Outliers & Correlations' },
          { id: 'preview', label: 'Data Preview' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 text-xs font-semibold transition border-b-2 ${
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW & PROFILE */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {loadingProfile ? (
            <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              <span>Analyzing dataset statistics...</span>
            </div>
          ) : summary ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 text-center">
                <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">Quality Health Score</div>
                <div className="text-4xl font-extrabold text-emerald-400">
                  {summary.quality_score}<span className="text-base font-normal text-slate-500">/100</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Weighted completeness & cleanliness</p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 text-center">
                <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">Duplicate Rows</div>
                <div className="text-4xl font-extrabold text-slate-100">
                  {summary.duplicate_count}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{summary.duplicate_percentage}% of total observations</p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 text-center">
                <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">Missing Cells</div>
                <div className="text-4xl font-extrabold text-slate-100">
                  {summary.missing_cells_total}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{summary.missing_cells_percentage}% total cell density</p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 text-center">
                <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">Memory Footprint</div>
                <div className="text-4xl font-extrabold text-cyan-400">
                  {(summary.memory_usage_bytes / 1024 / 1024).toFixed(2)} MB
                </div>
                <p className="text-[11px] text-slate-500 mt-1">In-memory vectorized cache</p>
              </div>
            </div>
          ) : null}

          {/* Column Classification Breakdown */}
          {summary && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Attribute Classification</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-indigo-400">
                    <span>Numeric Metrics ({summary.column_types.numeric.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {summary.column_types.numeric.map((col) => (
                      <span key={col} className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 text-[11px] font-mono">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-cyan-400">
                    <span>Categorical Dimensions ({summary.column_types.categorical.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {summary.column_types.categorical.map((col) => (
                      <span key={col} className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 text-[11px] font-mono">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-amber-400">
                    <span>Date & Temporal Dimensions ({summary.column_types.datetime.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {summary.column_types.datetime.length > 0 ? (
                      summary.column_types.datetime.map((col) => (
                        <span key={col} className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[11px] font-mono">
                          {col}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">None detected</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COLUMN DEEP DIVE */}
      {activeTab === 'columns' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 overflow-x-auto shadow-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Column</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Missing</th>
                <th className="py-3 px-4">Unique</th>
                <th className="py-3 px-4">Mean / Top Value</th>
                <th className="py-3 px-4">Median</th>
                <th className="py-3 px-4">Min - Max</th>
                <th className="py-3 px-4">IQR Outliers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {profile?.columns.map((col) => {
                const s = colSummaries[col.name] || {};
                return (
                  <tr key={col.name} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-semibold text-slate-200">{col.name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-indigo-400 uppercase">
                        {col.data_type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {col.null_count > 0 ? (
                        <span className="text-amber-400 font-bold">{col.null_count} ({col.null_percentage}%)</span>
                      ) : (
                        <span className="text-emerald-400">0%</span>
                      )}
                    </td>
                    <td className="py-3 px-4">{col.unique_count.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      {s.type === 'numeric' ? s.mean : s.top_value ? `${s.top_value} (${s.top_frequency})` : '-'}
                    </td>
                    <td className="py-3 px-4">{s.type === 'numeric' ? s.median : '-'}</td>
                    <td className="py-3 px-4">
                      {s.type === 'numeric' ? `${s.min} → ${s.max}` : s.min ? `${s.min} → ${s.max}` : '-'}
                    </td>
                    <td className="py-3 px-4">
                      {s.outlier_count && s.outlier_count > 0 ? (
                        <span className="text-rose-400 font-bold">{s.outlier_count}</span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: OUTLIERS & CORRELATION MATRIX */}
      {activeTab === 'quality' && (
        <div className="space-y-6">
          {/* Outlier Report */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Statistical Outlier Variations (1.5x IQR)</h3>
            {profile?.outlier_report && Object.keys(profile.outlier_report).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(profile.outlier_report).map(([col, rep]) => (
                  <div key={col} className="bg-slate-950 p-4 rounded-xl border border-rose-900/30 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-rose-300">
                      <span>{col}</span>
                      <span className="text-[11px] bg-rose-950 text-rose-400 px-2 py-0.5 rounded">{rep.percentage}%</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {rep.outlier_count} records beyond [{rep.lower_bound}, {rep.upper_bound}]
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>No extreme statistical outlier distortions detected.</span>
              </p>
            )}
          </div>

          {/* Correlation Matrix Heatmap */}
          {Object.keys(corrMatrix).length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4 overflow-x-auto">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Pearson Correlation Matrix</h3>
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="py-2.5 px-3 text-left text-slate-400">Attribute</th>
                    {Object.keys(corrMatrix).map((col) => (
                      <th key={col} className="py-2.5 px-3 text-slate-300 font-mono">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {Object.keys(corrMatrix).map((rowCol) => (
                    <tr key={rowCol}>
                      <td className="py-2.5 px-3 text-left font-semibold text-slate-200">{rowCol}</td>
                      {Object.keys(corrMatrix).map((colCol) => {
                        const val = corrMatrix[rowCol]?.[colCol] ?? 0;
                        const isHigh = Math.abs(val) > 0.6 && rowCol !== colCol;
                        return (
                          <td
                            key={colCol}
                            className={`py-2.5 px-3 ${
                              rowCol === colCol
                                ? 'text-slate-600 bg-slate-950'
                                : isHigh
                                ? 'text-indigo-300 font-bold bg-indigo-950/40'
                                : 'text-slate-400'
                            }`}
                          >
                            {val.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DATA PREVIEW TABLE */}
      {activeTab === 'preview' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing rows {((previewPage - 1) * previewPageSize) + 1} to{' '}
              {Math.min(previewPage * previewPageSize, previewData?.total_rows || 0)} of{' '}
              {previewData?.total_rows.toLocaleString() || selectedDataset.row_count.toLocaleString()}
            </span>

            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={previewPageSize}
                onChange={(e) => {
                  const sz = Number(e.target.value);
                  setPreviewPageSize(sz);
                  loadPreview(selectedDataset.id, 1, sz);
                }}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {loadingPreview ? (
            <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              <span>Fetching table partition...</span>
            </div>
          ) : previewData ? (
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-950 border-b border-slate-800">
                  <tr className="text-slate-400 font-semibold uppercase tracking-wider font-mono">
                    {previewData.columns.map((c) => (
                      <th key={c} className="py-2.5 px-3 whitespace-nowrap">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                  {previewData.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-800/40 transition">
                      {previewData.columns.map((c) => (
                        <td key={c} className="py-2 px-3 whitespace-nowrap">
                          {row[c] !== null && row[c] !== undefined ? String(row[c]) : <span className="text-slate-600">NULL</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {/* Pagination Controls */}
          {previewData && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                disabled={previewPage <= 1}
                onClick={() => loadPreview(selectedDataset.id, previewPage - 1, previewPageSize)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 disabled:opacity-40 hover:bg-slate-700 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="text-xs text-slate-400">Page {previewPage}</span>
              <button
                disabled={previewPage * previewPageSize >= (previewData.total_rows || 0)}
                onClick={() => loadPreview(selectedDataset.id, previewPage + 1, previewPageSize)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 disabled:opacity-40 hover:bg-slate-700 transition"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Data Cleaning Studio Modal */}
      {selectedDataset && (
        <DataCleanerModal
          dataset={selectedDataset}
          isOpen={cleanerOpen}
          onClose={() => setCleanerOpen(false)}
          onSaved={() => {
            setCleanerOpen(false);
            onRefreshDatasets();
          }}
        />
      )}
    </div>
  );
};
