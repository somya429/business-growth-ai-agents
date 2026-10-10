import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from './components/ui/Toast';
import { AgentDrawer } from './components/layout/AgentDrawer';
import { PageShell } from './components/PageShell';

// First-run Welcome & Overview Page
import { GrowthXLandingPage } from './pages/GrowthXLandingPage';
import { WelcomePage } from './pages/WelcomePage';
import { PlanPage } from './pages/PlanPage';
import { TasksPage } from './pages/TasksPage';
import { ApexCommandPage } from './pages/ApexCommandPage';

// Buddy Mascot & System Context
import { BuddyProvider } from './buddy/BuddyContext';
import { Buddy } from './buddy/Buddy';

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
      <BuddyProvider>
        <HashRouter>
          <ScrollToTop />
          <ToastContainer />
          <AgentDrawer />
          <Buddy />
          <Routes>
            {/* Root: GrowthX Landing Page & Overview */}
            <Route path="/" element={<GrowthXLandingPage />} />
            <Route path="/home" element={<GrowthXLandingPage />} />
            <Route path="/welcome" element={<WelcomePage />} />

          {/* Phase Planning & Task Graph */}
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/tasks" element={<TasksPage />} />

          {/* Autonomous Head Agent Orchestrator & Executive Command */}
          <Route
            path="/command"
            element={
              <PageShell title="Apex Executive Command — Verity">
                <ApexCommandPage />
              </PageShell>
            }
          />
          <Route
            path="/apex"
            element={
              <PageShell title="Apex Executive Command — Verity">
                <ApexCommandPage />
              </PageShell>
            }
          />
          <Route
            path="/chief"
            element={
              <PageShell title="Apex Executive Command — Verity">
                <ApexCommandPage />
              </PageShell>
            }
          />

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

          {/* Fallback to GrowthX Landing Page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </BuddyProvider>
  </QueryClientProvider>
);
};

export default App;
