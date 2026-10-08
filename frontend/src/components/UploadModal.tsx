import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { Dataset } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (dataset: Dataset) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      selectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      selectFile(e.target.files[0]);
    }
  };

  const selectFile = (selectedFile: File) => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls', 'json', 'parquet'].includes(ext || '')) {
      setError('Unsupported file type. Please upload CSV, Excel, JSON, or Parquet.');
      setFile(null);
      return;
    }
    setError(null);
    setFile(selectedFile);
    if (!datasetName) {
      const base = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
      setDatasetName(base.charAt(0).toUpperCase() + base.slice(1));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    if (datasetName) formData.append('name', datasetName);

    try {
      const uploaded = await api.uploadDataset(formData);
      onSuccess(uploaded);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to upload dataset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Upload Analytical Dataset</h3>
            <p className="text-xs text-slate-400 mt-0.5">Supports CSV, Excel (XLSX, XLS), JSON, and Parquet</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-400 bg-rose-950/40 border border-rose-900/60 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragActive ? 'border-indigo-500 bg-indigo-950/20' : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.json,.parquet"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 animate-in zoom-in" />
                <div className="text-sm font-medium text-slate-200">{file.name}</div>
                <div className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                <span className="text-[11px] text-indigo-400 underline mt-1">Click to replace</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <UploadCloud className="w-10 h-10 text-indigo-400" />
                <div className="text-sm font-medium text-slate-200">
                  Drag & drop your dataset here, or <span className="text-indigo-400 underline">browse</span>
                </div>
                <div className="text-xs text-slate-400">Up to 50MB per file</div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Dataset Display Name</label>
            <input
              type="text"
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              placeholder="e.g. Q2 Customer Churn & Transactions"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition shadow-lg shadow-indigo-600/25"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Profiling Dataset...' : 'Upload & Analyze'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
