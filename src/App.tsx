import React, { useEffect, Suspense, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { ToastContainer, Onboarding, ErrorBoundary } from './components';
import { useUIStore } from './stores';
import { useAppStore } from './stores';
import { useGlobalHotkey } from './hooks';
import { KeyboardPage, VoicePage, ModelsPage, LogsPage } from './pages';
import type { Page } from './types';
import './styles/index.css';

const pages: Record<Page, React.FC> = {
  keyboard: KeyboardPage,
  voice: VoicePage,
  models: ModelsPage,
  logs: LogsPage,
  settings: () => null,
};

function AppContent() {
  const { currentPage } = useUIStore();
  const { init: initApp, isOnboardingComplete } = useAppStore();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Enable global hotkey listener
  useGlobalHotkey(isInitialized);

  useEffect(() => {
    initApp().then(() => {
      setIsInitialized(true);
    });
  }, [initApp]);

  useEffect(() => {
    if (isInitialized && !isOnboardingComplete) {
      setShowOnboarding(true);
    }
  }, [isInitialized, isOnboardingComplete]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-primary">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⌨️</div>
          <p className="text-text-secondary">Loading BOSSINPUT...</p>
        </div>
      </div>
    );
  }

  const CurrentPage = pages[currentPage];

  return (
    <div className="flex flex-col h-screen bg-bg-primary text-text-primary">
      {/* Onboarding Overlay */}
      {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-hidden flex flex-col">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <p className="text-text-secondary">Loading...</p>
            </div>
          }>
            <CurrentPage />
          </Suspense>
        </main>
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Toast Container */}
      <ToastContainer />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;
