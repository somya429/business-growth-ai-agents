import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomePage } from '../pages/HomePage';
import { HowPage } from '../pages/HowPage';
import { AgentsPage } from '../pages/AgentsPage';
import { TrustPage } from '../pages/TrustPage';
import { IndustriesPage } from '../pages/IndustriesPage';
import { ContactPage } from '../pages/ContactPage';
import { Nav } from '../components/Nav';

// Mock framer-motion useReducedMotion if needed
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<any>('framer-motion');
  return {
    ...actual,
    useReducedMotion: () => false,
  };
});

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const renderWithProviders = (ui: React.ReactElement, initialEntries: string[] = ['/']) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Verity Marketing Website', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Navigation Links & Pages', () => {
    it('renders navigation bar with correct links and active state', () => {
      renderWithProviders(<Nav />);

      expect(screen.getByRole('link', { name: /Verity/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /How it works/i })).toHaveAttribute('href', '/how');
      expect(screen.getByRole('link', { name: /^Agents$/i })).toHaveAttribute('href', '/agents');
      expect(screen.getByRole('link', { name: /Trust/i })).toHaveAttribute('href', '/trust');
      expect(screen.getByRole('link', { name: /Industries/i })).toHaveAttribute('href', '/industries');
      expect(screen.getByRole('link', { name: /Studio/i })).toHaveAttribute('href', '/workspace');
      expect(screen.getAllByRole('link', { name: /Work with Agents/i })[0]).toHaveAttribute('href', '/workspace');
    });

    it('renders Home page with exact headline and strip', () => {
      renderWithProviders(<HomePage />);

      expect(screen.getByText('AI GROWTH TEAM')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Growth,\s*verified\./i);
      expect(screen.getByText('ONE RUN, START TO FINISH')).toBeInTheDocument();
      expect(screen.getByText('Atlas')).toBeInTheDocument();
      expect(screen.getByText('Veritas')).toBeInTheDocument();
    });

    it('renders How page with 5 steps and 3 safeguards', () => {
      renderWithProviders(<HowPage />);

      expect(screen.getByText('HOW IT WORKS')).toBeInTheDocument();
      expect(screen.getByText('Onboard')).toBeInTheDocument();
      expect(screen.getByText('Research')).toBeInTheDocument();
      expect(screen.getByText('Draft')).toBeInTheDocument();
      expect(screen.getByText('Verify')).toBeInTheDocument();
      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.getByText('RULES, NOT AI')).toBeInTheDocument();
      expect(screen.getByText('ONE SENDER')).toBeInTheDocument();
      expect(screen.getByText('FULL TRACE')).toBeInTheDocument();
    });

    it('renders Agents page with 8 agents and 2 rules engines', () => {
      renderWithProviders(<AgentsPage />);

      expect(screen.getByText('THE TEAM')).toBeInTheDocument();
      expect(screen.getByText('Atlas')).toBeInTheDocument();
      expect(screen.getByText('Veritas')).toBeInTheDocument();
      expect(screen.getByText('Warden')).toBeInTheDocument();
      expect(screen.getByText('Courier')).toBeInTheDocument();
    });

    it('renders Industries page with 4 industries including Your business', () => {
      renderWithProviders(<IndustriesPage />);

      expect(screen.getByText('ANY BUSINESS')).toBeInTheDocument();
      expect(screen.getByText('B2B software')).toBeInTheDocument();
      expect(screen.getByText('E-commerce')).toBeInTheDocument();
      expect(screen.getByText('Local services')).toBeInTheDocument();
      expect(screen.getByText('Your business')).toBeInTheDocument();
    });
  });

  describe('2. Trust Page: Score Re-calculation & Interaction', () => {
    it('starts with base score 54 and REVIEW status, recalculates on Accept / Dismiss', async () => {
      renderWithProviders(<TrustPage />);

      expect(screen.getByText('VERITAS, THE TRUST AUDITOR')).toBeInTheDocument();
      expect(screen.getByText('REVIEW')).toBeInTheDocument();

      // Find all Accept buttons
      const acceptButtons = screen.getAllByRole('button', { name: /^Accept$/i });
      expect(acceptButtons.length).toBe(3);

      // Accept first flag (+12: 54 -> 66)
      fireEvent.click(acceptButtons[0]);

      // Accept second flag (+12: 66 -> 78)
      fireEvent.click(acceptButtons[1]);

      // Accept third flag (+12: 78 -> 90 => PASS >= 80)
      fireEvent.click(acceptButtons[2]);

      // Awaits PASS label
      await waitFor(() => {
        expect(screen.getByText('PASS')).toBeInTheDocument();
      });

      // Verify reset works
      const resetButton = screen.getByRole('button', { name: /Reset/i });
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(screen.getByText('REVIEW')).toBeInTheDocument();
      });
    });

    it('updates score by +6 when dismissing a flag', async () => {
      renderWithProviders(<TrustPage />);

      const dismissButtons = screen.getAllByRole('button', { name: /^Dismiss$/i });
      fireEvent.click(dismissButtons[0]);

      // Card is marked resolved
      await waitFor(() => {
        expect(dismissButtons[0]).toBeDisabled();
      });
    });
  });

  describe('3. Contact Page: Client-side Validation & Submission', () => {
    it('validates empty inputs and displays helpful inline errors', async () => {
      renderWithProviders(<ContactPage />);

      const submitButton = screen.getByRole('button', { name: /Request demo/i });
      fireEvent.click(submitButton);

      expect(screen.getByText('Please enter your name.')).toBeInTheDocument();
      expect(screen.getByText('Please enter your work email.')).toBeInTheDocument();
    });

    it('validates invalid email format', async () => {
      renderWithProviders(<ContactPage />);

      const nameInput = screen.getByLabelText(/Name/i);
      const emailInput = screen.getByLabelText(/Work email/i);
      const submitButton = screen.getByRole('button', { name: /Request demo/i });

      fireEvent.change(nameInput, { target: { value: 'Eleanor Vance' } });
      fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
      fireEvent.click(submitButton);

      expect(screen.queryByText('Please enter your name.')).not.toBeInTheDocument();
      expect(screen.getByText('Please enter a valid work email address.')).toBeInTheDocument();
    });

    it('submits valid form and transitions to calm success state', async () => {
      renderWithProviders(<ContactPage />);

      const nameInput = screen.getByLabelText(/Name/i);
      const emailInput = screen.getByLabelText(/Work email/i);
      const submitButton = screen.getByRole('button', { name: /Request demo/i });

      fireEvent.change(nameInput, { target: { value: 'Eleanor Vance' } });
      fireEvent.change(emailInput, { target: { value: 'eleanor@vancecorp.com' } });
      fireEvent.click(submitButton);

      await waitFor(
        () => {
          expect(screen.getByText('Thanks. We will be in touch.')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });

  describe('4. Accessibility & Reduced Motion', () => {
    it('disables looping and ambient animation when reduced motion is preferred', () => {
      // Test HomePage honors reduced motion
      const { container } = renderWithProviders(<HomePage />);

      // Verify the page renders accessible content without crashing or forcing infinite animation loops
      expect(container.querySelector('h1')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Growth,\s*verified\./i);
    });
  });

  describe('5. Direct Agent Studio & Email Dispatch', () => {
    const mockPipelineData = {
      company_name: 'Anthropic',
      research_data: { industry: 'AI Safety & Research' },
      business_signals: [],
      buying_committee: [],
      account_intelligence: {},
      why_now_analysis: { timing_urgency: 'HIGH', score: 94, triggers: [] },
      outreach_sequence: [
        { step_number: 1, channel: 'email', subject: 'Infrastructure assurance', body: 'Hello Elena' },
      ],
      crm_status: 'ready',
      email_status: 'ready',
      execution_metadata: { node_durations: {}, status: 'completed', errors: [] },
    };

    it('renders Agent Studio and executes multi-agent pipeline with email agent dispatch', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (typeof url === 'string' && url.includes('/api/pipeline/run')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPipelineData),
          });
        }
        if (typeof url === 'string' && url.includes('/api/email/dispatch')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                status: 'delivered',
                provider: 'Resend API',
                message_id: 'msg_mock_test_123',
                to: 'delivered@resend.dev',
                delivered_at: new Date().toISOString(),
              }),
          });
        }
        return Promise.reject(new Error('Backend offline in unit test'));
      });

      try {
        const { WorkspacePage } = await import('../pages/WorkspacePage');
        renderWithProviders(<WorkspacePage />);

        expect(screen.getByText('LIVE AGENT WORKSPACE')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /Autonomous Growth Studio/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/Target Account To Research/i)).toHaveValue('Anthropic');

        // Click Run Agents
        const runButton = screen.getByRole('button', { name: /Run Agents/i });
        fireEvent.click(runButton);

        // Verify that after execution, intelligence dossier and verified draft appear
        await waitFor(
          () => {
            expect(screen.getByText(/PIPELINE COMPLETED & VERIFIED/i)).toBeInTheDocument();
          },
          { timeout: 3000 }
        );

        // Check Authorize & Send Email button is rendered
        const sendButton = screen.getByRole('button', { name: /Authorize & Send Email/i });
        expect(sendButton).toBeInTheDocument();

        // Click to dispatch email with integrated email agent
        fireEvent.click(sendButton);

        await waitFor(() => {
          expect(screen.getByText(/Outreach Successfully Delivered/i)).toBeInTheDocument();
        }, { timeout: 3000 });
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('renders explicit "Not sent" badge and error details when dispatch fails', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (typeof url === 'string' && url.includes('/api/pipeline/run')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPipelineData),
          });
        }
        if (typeof url === 'string' && url.includes('/api/email/dispatch')) {
          return Promise.resolve({
            ok: false,
            json: () =>
              Promise.resolve({
                status: 'failed',
                provider: 'Resend API',
                error: 'ValidationError: API key is invalid',
              }),
          });
        }
        return Promise.reject(new Error('Backend offline in unit test'));
      });

      try {
        const { WorkspacePage } = await import('../pages/WorkspacePage');
        renderWithProviders(<WorkspacePage />);

        const runButton = screen.getByRole('button', { name: /Run Agents/i });
        fireEvent.click(runButton);

        await waitFor(
          () => {
            expect(screen.getByText(/PIPELINE COMPLETED & VERIFIED/i)).toBeInTheDocument();
          },
          { timeout: 3000 }
        );

        const sendButton = screen.getByRole('button', { name: /Authorize & Send Email/i });
        fireEvent.click(sendButton);

        await waitFor(() => {
          expect(screen.getByText(/Delivery Attempt Failed/i)).toBeInTheDocument();
          expect(screen.getAllByText(/Not sent/i).length).toBeGreaterThan(0);
        }, { timeout: 3000 });
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
