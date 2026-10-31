import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { OverviewPage } from './pages/OverviewPage';
import { EmployeeInsightsPage } from './pages/EmployeeInsightsPage';
import { WellbeingAlertsPage } from './pages/WellbeingAlertsPage';
import { SimulationPlaygroundPage } from './pages/SimulationPlaygroundPage';
import { AiAnalysisPage } from './pages/AiAnalysisPage';
import { ReportsPage } from './pages/ReportsPage';
import { PrivacySettingsPage } from './pages/PrivacySettingsPage';
import { EmployeeProfileModal } from './pages/EmployeeProfileModal';
import { apiService } from './services/api';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [openAlertsCount, setOpenAlertsCount] = useState<number>(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    apiService
      .getDashboardSummary()
      .then((sum) => setOpenAlertsCount(sum.open_alerts))
      .catch(console.error);
  }, [refreshTrigger, currentTab]);

  const titles: Record<NavTab, { title: string; subtitle: string }> = {
    overview: {
      title: 'Digital Wellbeing Overview',
      subtitle: 'Continuous workload monitoring, risk metrics, and productivity correlations',
    },
    employees: {
      title: 'Employee Insights Directory',
      subtitle: 'Comprehensive telemetry trends across simulated squads',
    },
    alerts: {
      title: 'Wellbeing Alerts Queue',
      subtitle: 'Actionable check-in workflows for sustained overwork patterns',
    },
    simulation: {
      title: 'Simulation Playground',
      subtitle: 'Live machine learning anomaly inference and explainable risk modeling',
    },
    'ai-analysis': {
      title: 'AI Analysis & Technical Explainability',
      subtitle: 'Isolation Forest mathematical outlier model vs rule-based wellbeing scoring',
    },
    reports: {
      title: 'Executive Wellbeing Reports',
      subtitle: 'Team-level sustainability index and leadership summary',
    },
    privacy: {
      title: 'Privacy Safeguards & System Settings',
      subtitle: 'Responsible AI parameters, non-surveillance principles, and scoring weights',
    },
  };

  const currentMeta = titles[currentTab] || titles.overview;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        openAlertsCount={openAlertsCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          title={currentMeta.title}
          subtitle={currentMeta.subtitle}
          onSelectEmployeeProfile={(id) => setSelectedEmployeeId(id)}
          onDataRegenerated={() => setRefreshTrigger((prev) => prev + 1)}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'overview' && (
              <OverviewPage
                onSelectEmployeeProfile={(id) => setSelectedEmployeeId(id)}
                onNavigateToTab={(tab) => setCurrentTab(tab)}
              />
            )}
            {currentTab === 'employees' && (
              <EmployeeInsightsPage
                onSelectEmployee={(id) => setSelectedEmployeeId(id)}
              />
            )}
            {currentTab === 'alerts' && <WellbeingAlertsPage />}
            {currentTab === 'simulation' && <SimulationPlaygroundPage />}
            {currentTab === 'ai-analysis' && (
              <AiAnalysisPage
                onSelectEmployeeProfile={(id) => setSelectedEmployeeId(id)}
              />
            )}
            {currentTab === 'reports' && <ReportsPage />}
            {currentTab === 'privacy' && <PrivacySettingsPage />}
          </div>
        </main>
      </div>

      {/* Deep Employee Profile Modal */}
      <EmployeeProfileModal
        employeeId={selectedEmployeeId}
        onClose={() => setSelectedEmployeeId(null)}
      />
    </div>
  );
}

export default App;
