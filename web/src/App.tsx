import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from './components/ui/Toast';
import { AgentDrawer } from './components/layout/AgentDrawer';
import { PageShell } from './components/PageShell';

// First-run Welcome & Overview Page
import { WelcomePage } from './pages/WelcomePage';
import { PlanPage } from './pages/PlanPage';
import { TasksPage } from './pages/TasksPage';

// Comprehensive Agent Control Pages
import { MissionControlPage } from './features/mission-control/MissionControlPage';
import { ReviewDeskPage } from './features/review/ReviewDeskPage';
import { AgentRosterPage } from './features/agents/AgentRosterPage';
import { OnboardingPage } from './features/onboarding/OnboardingPage';
import { ResultsPage } from './features/results/ResultsPage';

// Workspace & Marketing Pages
import { WorkspacePage } from './pages/WorkspacePage';
import { HomePage } from './pages/HomePage';
import { HowPage } from './pages/HowPage';
import { TrustPage } from './pages/TrustPage';
import { IndustriesPage } from './pages/IndustriesPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
    },
  },
});

// Helper to scroll to top on hash route change
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <ScrollToTop />
        <ToastContainer />
        <AgentDrawer />
        <Routes>
          {/* Root: First-run Welcome & Project Overview Page */}
          <Route path="/" element={<WelcomePage />} />
          <Route path="/welcome" element={<WelcomePage />} />

          {/* Phase Planning & Task Graph */}
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/tasks" element={<TasksPage />} />

          {/* Orchestrator Command Center */}
          <Route
            path="/orchestrator"
            element={
              <PageShell title="Orchestrator Command Center — Verity">
                <MissionControlPage />
              </PageShell>
            }
          />
          <Route
            path="/run/:runId"
            element={
              <PageShell title="Orchestrator Command Center — Verity">
                <MissionControlPage />
              </PageShell>
            }
          />

          {/* Human Review & Task Approval Desk */}
          <Route
            path="/review"
            element={
              <PageShell title="Review & Approval Desk — Verity">
                <ReviewDeskPage />
              </PageShell>
            }
          />
          <Route
            path="/run/:runId/review"
            element={
              <PageShell title="Review & Approval Desk — Verity">
                <ReviewDeskPage />
              </PageShell>
            }
          />

          {/* Individual Agent Fleet & Assigned Roles */}
          <Route
            path="/roster"
            element={
              <PageShell title="Agent Fleet & Roster — Verity">
                <AgentRosterPage />
              </PageShell>
            }
          />
          <Route
            path="/agents"
            element={
              <PageShell title="Agent Fleet & Roster — Verity">
                <AgentRosterPage />
              </PageShell>
            }
          />

          {/* Business Onboarding, ICP, Brand Voice & Documents */}
          <Route
            path="/onboard"
            element={
              <PageShell title="Company Onboarding & Governance — Verity">
                <OnboardingPage />
              </PageShell>
            }
          />
          <Route
            path="/company"
            element={
              <PageShell title="Company Onboarding & Governance — Verity">
                <OnboardingPage />
              </PageShell>
            }
          />

          {/* Results & Continuous Learning */}
          <Route
            path="/results"
            element={
              <PageShell title="Results & Continuous Learning — Verity">
                <ResultsPage />
              </PageShell>
            }
          />
          <Route
            path="/run/:runId/results"
            element={
              <PageShell title="Results & Continuous Learning — Verity">
                <ResultsPage />
              </PageShell>
            }
          />

          {/* Target Account Studio & Resend Dispatch */}
          <Route path="/workspace" element={<WorkspacePage />} />
          <Route path="/studio" element={<WorkspacePage />} />

          {/* Reference & Marketing Pages */}
          <Route path="/home" element={<HomePage />} />
          <Route path="/how" element={<HowPage />} />
          <Route path="/trust" element={<TrustPage />} />
          <Route path="/industries" element={<IndustriesPage />} />

          {/* Fallback to Welcome */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  );
};

export default App;
