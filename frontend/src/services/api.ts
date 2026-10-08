import { 
  User, Dataset, DatasetProfile, Conversation, ChatMessage, DashboardStats, ReportItem, VisualizationConfig 
} from '../types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('insight_ai_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    ...getAuthHeader(),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'An error occurred during request.';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      errorDetail = `Server error ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Auth
  async login(username_or_email: string, password: string):Promise<{ access_token: string; user: User }> {
    return request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username_or_email, password }),
    });
  },

  async register(email: string, username: string, password: string, full_name?: string): Promise<{ access_token: string; user: User }> {
    return request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password, full_name }),
    });
  },

  async demoLogin(): Promise<{ access_token: string; user: User }> {
    return request('/auth/demo', { method: 'POST' });
  },

  async getMe(): Promise<User> {
    return request('/users/me');
  },

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    return request('/dashboard/stats');
  },

  async getHealth(): Promise<{ status: string; openai_configured: boolean; llm_provider: string }> {
    return request('/health');
  },

  // Datasets
  async getDatasets(): Promise<Dataset[]> {
    return request('/datasets');
  },

  async getDataset(id: number): Promise<Dataset> {
    return request(`/datasets/${id}`);
  },

  async uploadDataset(formData: FormData): Promise<Dataset> {
    return request('/datasets/upload', {
      method: 'POST',
      body: formData,
    });
  },

  async deleteDataset(id: number): Promise<{ message: string }> {
    return request(`/datasets/${id}`, { method: 'DELETE' });
  },

  async toggleFavorite(id: number): Promise<{ id: number; is_favorite: boolean }> {
    return request(`/datasets/${id}/favorite`, { method: 'POST' });
  },

  async getDatasetProfile(id: number): Promise<DatasetProfile> {
    return request(`/datasets/${id}/profile`);
  },

  async getDatasetPreview(id: number, page: number = 1, pageSize: number = 25): Promise<{
    columns: string[];
    rows: any[];
    total_rows: number;
    page: number;
    page_size: number;
  }> {
    return request(`/datasets/${id}/preview?page=${page}&page_size=${pageSize}`);
  },

  async cleanPreview(id: number, config: any): Promise<any> {
    return request(`/datasets/${id}/clean/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
  },

  async cleanApply(id: number, config: any): Promise<any> {
    return request(`/datasets/${id}/clean/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
  },

  getDatasetDownloadUrl(id: number): string {
    return `${API_BASE}/datasets/${id}/download`;
  },

  // Chat & AI Analyst
  async sendChat(dataset_id: number, message: string, conversation_id?: number): Promise<ChatMessage & { conversation_id: number }> {
    return request('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataset_id, message, conversation_id }),
    });
  },

  async getConversations(dataset_id?: number): Promise<Conversation[]> {
    const query = dataset_id ? `?dataset_id=${dataset_id}` : '';
    return request(`/conversations${query}`);
  },

  async getConversation(id: number): Promise<Conversation> {
    return request(`/conversations/${id}`);
  },

  async updateConversation(id: number, title: string): Promise<any> {
    return request(`/conversations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
  },

  async deleteConversation(id: number): Promise<any> {
    return request(`/conversations/${id}`, { method: 'DELETE' });
  },

  // Custom Visualizations Builder
  async createCustomViz(params: {
    dataset_id: number;
    title: string;
    chart_type: string;
    x_column: string;
    y_column?: string;
    aggregation?: string;
    limit?: number;
  }): Promise<{
    title: string;
    sql_query: string;
    visualization: VisualizationConfig;
    data: any[];
    columns: string[];
    execution_time_ms: number;
  }> {
    return request('/analysis/visualize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  },

  // Reports
  async generateReport(dataset_id: number, title?: string): Promise<ReportItem> {
    return request('/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataset_id, title }),
    });
  },

  async getReports(): Promise<ReportItem[]> {
    return request('/reports');
  },

  async getReport(id: number): Promise<ReportItem> {
    return request(`/reports/${id}`);
  },

  getReportPdfUrl(id: number): string {
    return `${API_BASE}/reports/${id}/download/pdf`;
  },

  getReportHtmlUrl(id: number): string {
    return `${API_BASE}/reports/${id}/download/html`;
  },

  getReportMarkdownUrl(id: number): string {
    return `${API_BASE}/reports/${id}/download/markdown`;
  },
};
