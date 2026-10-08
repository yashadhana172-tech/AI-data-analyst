import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { DatasetsPage } from './pages/DatasetsPage';
import { ChatPage } from './pages/ChatPage';
import { VisualizationsPage } from './pages/VisualizationsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { UploadModal } from './components/UploadModal';
import { api } from './services/api';
import { Dataset } from './types';
import { Loader2 } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | undefined>(undefined);

  const loadDatasets = async () => {
    try {
      const data = await api.getDatasets();
      setDatasets(data);
      if (data.length > 0 && !selectedDataset) {
        setSelectedDataset(data[0]);
      }
    } catch (err) {
      console.error('Error fetching datasets:', err);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, [user]);

  const handleAskQuestionFromDashboard = (q: string) => {
    setPendingQuestion(q);
    setCurrentTab('chat');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-sm font-medium">Initializing InsightAI Engine...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        datasets={datasets}
        selectedDataset={selectedDataset}
        onSelectDataset={setSelectedDataset}
        onOpenUpload={() => setUploadModalOpen(true)}
        activeTab={currentTab}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          datasetCount={datasets.length}
        />

        <main className="flex-1 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardPage
              onAskQuestion={handleAskQuestionFromDashboard}
              onSelectDatasetTab={() => setCurrentTab('datasets')}
              selectedDataset={selectedDataset}
            />
          )}

          {currentTab === 'datasets' && (
            <DatasetsPage
              datasets={datasets}
              selectedDataset={selectedDataset}
              onSelectDataset={setSelectedDataset}
              onRefreshDatasets={loadDatasets}
              onOpenUpload={() => setUploadModalOpen(true)}
            />
          )}

          {currentTab === 'chat' && (
            <ChatPage
              selectedDataset={selectedDataset}
              initialQuestion={pendingQuestion}
              onClearInitialQuestion={() => setPendingQuestion(undefined)}
            />
          )}

          {currentTab === 'visualizations' && (
            <VisualizationsPage
              datasets={datasets}
              selectedDataset={selectedDataset}
              onSelectDataset={setSelectedDataset}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsPage selectedDataset={selectedDataset} />
          )}

          {currentTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={(newDs) => {
          setDatasets((prev) => [newDs, ...prev]);
          setSelectedDataset(newDs);
          setCurrentTab('datasets');
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
