export interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  is_admin: boolean;
}

export interface DatasetColumn {
  id: number;
  name: string;
  data_type: string;
  python_type: string;
  null_count: number;
  unique_count: number;
  sample_values?: string;
}

export interface Dataset {
  id: number;
  name: string;
  original_filename: string;
  file_format: string;
  row_count: number;
  column_count: number;
  file_size_bytes: number;
  is_favorite: boolean;
  is_cleaned: boolean;
  created_at: string;
  columns?: DatasetColumn[];
}

export interface DatasetProfile {
  summary: {
    row_count: number;
    column_count: number;
    file_size_bytes: number;
    memory_usage_bytes: number;
    duplicate_count: number;
    duplicate_percentage: number;
    missing_cells_total: number;
    missing_cells_percentage: number;
    quality_score: number;
    column_types: {
      numeric: string[];
      categorical: string[];
      datetime: string[];
      boolean: string[];
    };
  };
  columns: Array<{
    name: string;
    null_count: number;
    null_percentage: number;
    unique_count: number;
    data_type: string;
    python_type: string;
  }>;
  column_summaries: Record<string, any>;
  missing_report: Record<string, { null_count: number; null_percentage: number }>;
  outlier_report: Record<string, { outlier_count: number; percentage: number; lower_bound: number; upper_bound: number }>;
  correlation_matrix: Record<string, Record<string, number>>;
}

export interface VisualizationConfig {
  chart_type: string;
  title?: string;
  x_axis?: string;
  y_axis?: string;
  plotly_spec?: {
    data: any[];
    layout: any;
    config?: any;
  };
  metrics?: Array<{ label: string; value: any }>;
  recharts_data?: any[];
}

export interface InsightsData {
  answer: string;
  key_findings: string[];
  business_insights: string;
  recommendations: string[];
  limitations: string;
  follow_up_questions: string[];
}

export interface ChatMessage {
  id: number | string;
  role: 'user' | 'assistant';
  content?: string;
  answer?: string;
  sql_query?: string;
  key_findings?: string[];
  business_insights?: string;
  recommendations?: string[];
  limitations?: string;
  follow_up_questions?: string[];
  visualization?: VisualizationConfig;
  table_data?: {
    columns: string[];
    rows: any[];
    total_rows: number;
  };
  execution_time_ms?: number;
  created_at?: string;
  error?: string;
}

export interface Conversation {
  id: number;
  dataset_id?: number;
  title: string;
  created_at: string;
  messages?: ChatMessage[];
}

export interface DashboardStats {
  total_datasets: number;
  total_rows_analyzed: number;
  total_columns: number;
  favorite_datasets: Array<{ id: number; name: string; rows: number; format: string }>;
  recent_analyses: Array<{
    id: number;
    dataset_id: number;
    query: string;
    summary: string;
    chart_type: string;
    created_at: string;
  }>;
  recent_questions: string[];
  demo_questions: string[];
}

export interface ReportItem {
  id: number;
  dataset_id: number;
  title: string;
  summary: string;
  content_markdown: string;
  created_at: string;
}
