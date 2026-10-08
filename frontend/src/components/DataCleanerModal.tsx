import React, { useState } from 'react';
import { Sparkles, Check, Download, AlertCircle, X, Loader2, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { Dataset } from '../types';

interface DataCleanerModalProps {
  dataset: Dataset;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (newDataset: Dataset) => void;
}

export const DataCleanerModal: React.FC<DataCleanerModalProps> = ({ dataset, isOpen, onClose, onSaved }) => {
  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [dropEmptyColumns, setDropEmptyColumns] = useState(true);
  const [numImputation, setNumImputation] = useState<'none' | 'mean' | 'median' | 'zero'>('median');
  const [catImputation, setCatImputation] = useState<'none' | 'mode' | 'unknown'>('mode');
  const [dropRowsNa, setDropRowsNa] = useState(false);
  const [newDatasetName, setNewDatasetName] = useState(`${dataset.name} (Cleaned)`);

  const [preview, setPreview] = useState<any | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handlePreview = async () => {
    setLoadingPreview(true);
    setError(null);
    try {
      const config = {
        remove_duplicates: removeDuplicates,
        drop_empty_columns: dropEmptyColumns,
        numerical_imputation: numImputation,
        categorical_imputation: catImputation,
        drop_rows_with_na: dropRowsNa,
      };
      const res = await api.cleanPreview(dataset.id, config);
      setPreview(res);
    } catch (err: any) {
      setError(err.message || 'Failed to preview transformations.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    setError(null);
    try {
      const config = {
        remove_duplicates: removeDuplicates,
        drop_empty_columns: dropEmptyColumns,
        numerical_imputation: numImputation,
        categorical_imputation: catImputation,
        drop_rows_with_na: dropRowsNa,
        save_as_new: true,
        new_name: newDatasetName,
      };
      const res = await api.cleanApply(dataset.id, config);
      setSuccessResult(res);
      const updatedDs = await api.getDataset(res.cleaned_dataset_id);
      onSaved(updatedDs);
    } catch (err: any) {
      setError(err.message || 'Failed to apply cleaning transformations.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">Data Cleaning Studio</h3>
              <p className="text-xs text-slate-400">Automated cleaning and imputation for: {dataset.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-400 bg-rose-950/40 border border-rose-900/60 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Transformation Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">Deduplication & Hygiene</div>
              
              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={removeDuplicates}
                  onChange={(e) => setRemoveDuplicates(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Remove exact duplicate records</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dropEmptyColumns}
                  onChange={(e) => setDropEmptyColumns(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Drop completely empty (100% null) columns</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dropRowsNa}
                  onChange={(e) => setDropRowsNa(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Drop any rows containing unhandled nulls</span>
              </label>
            </div>

            <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">Missing Value Imputation</div>
              
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Numerical Columns Imputation</label>
                <select
                  value={numImputation}
                  onChange={(e) => setNumImputation(e.target.value as any)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200"
                >
                  <option value="none">Do not impute</option>
                  <option value="median">Fill with Median (Robust to outliers)</option>
                  <option value="mean">Fill with Mean</option>
                  <option value="zero">Fill with 0</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Categorical Columns Imputation</label>
                <select
                  value={catImputation}
                  onChange={(e) => setCatImputation(e.target.value as any)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200"
                >
                  <option value="none">Do not impute</option>
                  <option value="mode">Fill with Mode (Most Frequent)</option>
                  <option value="unknown">Fill with 'Unknown' label</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePreview}
              disabled={loadingPreview}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              {loadingPreview && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Generate Impact Preview
            </button>
            <span className="text-xs text-slate-500">Preview changes before writing to disk</span>
          </div>

          {/* Impact Preview Card */}
          {preview && (
            <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                <span>Transformation Results:</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Before: {preview.before_rows} rows</span>
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-indigo-400 font-semibold">After: {preview.after_rows} rows</span>
                </div>
              </div>

              <div className="space-y-1">
                {preview.changes_applied.map((c: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-emerald-400">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Target Name and Commit */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Save As New Cleaned Dataset</label>
            <input
              type="text"
              value={newDatasetName}
              onChange={(e) => setNewDatasetName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
            />
          </div>

          {successResult && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center justify-between">
              <span>Cleaned dataset successfully created!</span>
              <a
                href={api.getDatasetDownloadUrl(successResult.cleaned_dataset_id)}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-800/80 hover:bg-emerald-700 text-white font-medium transition"
              >
                <Download className="w-3.5 h-3.5" />
                Download CSV
              </a>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              Close
            </button>
            <button
              onClick={handleApply}
              disabled={applying}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50"
            >
              {applying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {applying ? 'Applying Transformations...' : 'Apply & Save Dataset'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
