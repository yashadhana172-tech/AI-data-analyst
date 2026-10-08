import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  Activity, 
  Download, 
  Play, 
  Loader2, 
  SlidersHorizontal,
  Table as TableIcon
} from 'lucide-react';
import { api } from '../services/api';
import { Dataset, VisualizationConfig } from '../types';
import { PlotlyChart } from '../components/PlotlyChart';

interface VisualizationsPageProps {
  datasets: Dataset[];
  selectedDataset: Dataset | null;
  onSelectDataset: (ds: Dataset) => void;
}

export const VisualizationsPage: React.FC<VisualizationsPageProps> = ({
  datasets,
  selectedDataset,
  onSelectDataset,
}) => {
  const [chartType, setChartType] = useState('bar');
  const [xColumn, setXColumn] = useState('');
  const [yColumn, setYColumn] = useState('');
  const [aggregation, setAggregation] = useState('SUM');
  const [limit, setLimit] = useState(25);
  const [chartTitle, setChartTitle] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    visualization: VisualizationConfig;
    sql_query: string;
    data: any[];
    columns: string[];
  } | null>(null);

  // Set default columns when dataset changes
  useEffect(() => {
    if (selectedDataset && selectedDataset.columns && selectedDataset.columns.length > 0) {
      const stringCols = selectedDataset.columns.filter((c) => c.python_type === 'str');
      const numCols = selectedDataset.columns.filter((c) => c.python_type === 'float' || c.python_type === 'int');

      const initialX = stringCols.length > 0 ? stringCols[0].name : selectedDataset.columns[0].name;
      const initialY = numCols.length > 0 ? numCols[0].name : '';

      setXColumn(initialX);
      setYColumn(initialY);
      setChartTitle(`${initialY ? initialY.replace('_', ' ') : 'Count'} by ${initialX.replace('_', ' ')}`);
    }
  }, [selectedDataset]);

  const handleGenerate = async () => {
    if (!selectedDataset || !xColumn) return;
    setLoading(true);

    try {
      const res = await api.createCustomViz({
        dataset_id: selectedDataset.id,
        title: chartTitle || `${yColumn || 'Count'} by ${xColumn}`,
        chart_type: chartType,
        x_column: xColumn,
        y_column: yColumn || undefined,
        aggregation: yColumn ? aggregation : 'NONE',
        limit: limit,
      });
      setResult(res);
    } catch (err: any) {
      alert(err.message || 'Failed to render visualization.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!result || !result.data || result.data.length === 0) return;
    const cols = result.columns;
    const csvContent = [
      cols.join(','),
      ...result.data.map((row) => cols.map((c) => JSON.stringify(row[c] ?? '')).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${chartTitle || 'visualization_data'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Visualization Studio</h1>
          <p className="text-xs text-slate-400 mt-1">
            Build custom interactive multidimensional charts with DuckDB aggregations
          </p>
        </div>

        {result && (
          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Underlying CSV</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Column */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-3">
            <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
            <span>Chart Parameters</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Chart Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'bar', label: 'Bar Chart', icon: BarChart3 },
                { id: 'line', label: 'Line Chart', icon: TrendingUp },
                { id: 'pie', label: 'Pie Chart', icon: PieChart },
                { id: 'scatter', label: 'Scatter Plot', icon: Activity },
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setChartType(t.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium border transition ${
                      chartType === t.id
                        ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">X-Axis Dimension</label>
            <select
              value={xColumn}
              onChange={(e) => setXColumn(e.target.value)}
              className="w-full text-xs bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2.5"
            >
              {selectedDataset?.columns?.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.python_type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Y-Axis Metric (Optional for counts)</label>
            <select
              value={yColumn}
              onChange={(e) => setYColumn(e.target.value)}
              className="w-full text-xs bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2.5"
            >
              <option value="">None (Count frequency of X)</option>
              {selectedDataset?.columns
                ?.filter((c) => c.python_type === 'float' || c.python_type === 'int')
                .map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          {yColumn && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Aggregation</label>
              <select
                value={aggregation}
                onChange={(e) => setAggregation(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2.5"
              >
                <option value="SUM">SUM</option>
                <option value="AVG">AVG (Average)</option>
                <option value="COUNT">COUNT</option>
                <option value="MIN">MIN</option>
                <option value="MAX">MAX</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Display Rows Limit ({limit})</label>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{loading ? 'Executing Query...' : 'Generate Visualization'}</span>
          </button>
        </div>

        {/* Chart View Column */}
        <div className="lg:col-span-2 space-y-4">
          {result ? (
            <div className="space-y-4">
              <PlotlyChart config={result.visualization} height={460} />
              
              {/* Underlying Query Snippet */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-indigo-300">
                <span className="text-slate-500 block mb-1">DuckDB Executed Query:</span>
                <code>{result.sql_query}</code>
              </div>
            </div>
          ) : (
            <div className="h-[460px] bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-8 space-y-3">
              <BarChart3 className="w-10 h-10 text-slate-600" />
              <h3 className="text-sm font-semibold text-slate-300">No Visualization Rendered</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Select your axes and metric parameters on the left, then click 'Generate Visualization' to render.
              </p>
              <button
                onClick={handleGenerate}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
              >
                Quick Preview Default
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
