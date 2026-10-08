import React, { useEffect, useRef, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import { Download, Maximize2, Minimize2, BarChart2, TrendingUp, PieChart, Activity } from 'lucide-react';
import { VisualizationConfig } from '../types';

interface PlotlyChartProps {
  config: VisualizationConfig;
  className?: string;
  height?: number;
}

export const PlotlyChart: React.FC<PlotlyChartProps> = ({ config, className = '', height = 380 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    if (config.chart_type === 'kpi_card' || !config.plotly_spec) {
      return;
    }

    const { data, layout, config: plotConfig } = config.plotly_spec;

    // Apply dark theme defaults
    const responsiveLayout = {
      ...layout,
      autosize: true,
      height: isFullscreen ? 600 : height,
      paper_bgcolor: 'rgba(0, 0, 0, 0)',
      plot_bgcolor: 'rgba(0, 0, 0, 0)',
      font: {
        family: 'Inter, system-ui, sans-serif',
        color: '#94a3b8',
        size: 12,
      },
      margin: layout?.margin || { l: 50, r: 20, t: 40, b: 50 },
      xaxis: {
        ...layout?.xaxis,
        gridcolor: 'rgba(255, 255, 255, 0.06)',
        linecolor: 'rgba(255, 255, 255, 0.1)',
        tickcolor: 'rgba(255, 255, 255, 0.1)',
      },
      yaxis: {
        ...layout?.yaxis,
        gridcolor: 'rgba(255, 255, 255, 0.06)',
        linecolor: 'rgba(255, 255, 255, 0.1)',
        tickcolor: 'rgba(255, 255, 255, 0.1)',
      },
    };

    const finalConfig = {
      responsive: true,
      displayModeBar: false, // We supply custom sleek controls
      ...plotConfig,
    };

    Plotly.newPlot(containerRef.current, data, responsiveLayout, finalConfig);

    const handleResize = () => {
      if (containerRef.current) {
        Plotly.Plots.resize(containerRef.current);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        Plotly.purge(containerRef.current);
      }
    };
  }, [config, height, isFullscreen]);

  const handleDownload = () => {
    if (containerRef.current) {
      Plotly.downloadImage(containerRef.current, {
        format: 'png',
        width: 1200,
        height: 700,
        filename: `${config.title || 'insight_analysis_chart'}.png`,
      });
    }
  };

  // KPI card rendering
  if (config.chart_type === 'kpi_card' && config.metrics) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 ${className}`}>
        {config.metrics.map((m, idx) => (
          <div key={idx} className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 text-center shadow-lg hover:border-indigo-500/40 transition-all">
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">{m.label}</div>
            <div className="text-3xl font-bold text-indigo-400">
              {typeof m.value === 'number' ? m.value.toLocaleString() : m.value}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const getChartIcon = () => {
    switch (config.chart_type) {
      case 'line': return <TrendingUp className="w-4 h-4 text-indigo-400" />;
      case 'pie': return <PieChart className="w-4 h-4 text-emerald-400" />;
      case 'scatter': return <Activity className="w-4 h-4 text-cyan-400" />;
      default: return <BarChart2 className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className={`relative bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-xl ${isFullscreen ? 'fixed inset-6 z-50 bg-slate-950 p-6 flex flex-col justify-center' : ''} ${className}`}>
      {/* Chart Top Header Controls */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getChartIcon()}
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {config.chart_type.replace('_', ' ')} Chart
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDownload}
            title="Download Chart (PNG)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-all"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-all"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Plotly Canvas Container */}
      <div ref={containerRef} className="w-full flex-1" style={{ minHeight: isFullscreen ? 550 : height }} />
    </div>
  );
};
