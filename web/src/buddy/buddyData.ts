// Everything the Buddy says lives here. Plain English, short sentences.

// Shown every time the landing page opens or refreshes.
export const WELCOME = 'Hello! Welcome to Verity. I am your buddy. Click me for help, or drag me anywhere.';

// Notifications: arrives to demonstrate the live updates flow.
export const FEED_EVERY_MS = 30000;
export const FEED = [
  { text: 'Results waiting in Governance Desk for your approval.', to: { path: '/review' } },
  { text: 'Apex Command ready for your next growth directive.', to: { path: '/command' } },
  { text: 'Agent Fleet active: 7 autonomous agents ready.', to: { path: '/agents' } },
  { text: 'Set up or refine your business ICP and voice guidelines.', to: { path: '/onboard' } },
  { text: 'Mission Control shows real-time pipeline execution.', to: { path: '/orchestrator' } },
  { text: 'Growth Studio has target accounts ready for review.', to: { path: '/workspace' } },
];

// Click the buddy: it says one of these.
export const FUNNY = [
  'Hi! Need a hand?',
  'Ouch. That tickles.',
  'I never sleep. Mascot perks.',
  'Drag me anywhere. I like a good view.',
  'Still here. Still helpful.',
  'I am not a button. Okay, a little bit.',
  'Fun fact: I work for free snacks.',
  'Press me again. I can take it.',
];

// "Show a tip" gives these, one at a time, for the page you are on.
export const TIPS: Record<string, string[]> = {
  home: [
    'Pick a goal in the example and watch your AI team work.',
    'Press Start for free or Get started when you are ready. Setup takes a few minutes.',
  ],
  command: [
    'Apex acts as your autonomous head orchestrator.',
    'Type your objective in plain English, and Apex commands the fleet.',
  ],
  orchestrator: [
    'Mission Control shows real-time trace events from every agent.',
    'Notice how each step is checked before moving forward.',
  ],
  review: [
    'Every message requires your approval before being sent.',
    'You can edit the copy directly or click Approve to proceed.',
  ],
  onboarding: [
    'Press a letter key to pick an answer. Press Enter to continue.',
    'You can review and change any answer on the final review step.',
    'Your answers configure the Governance Desk and Company ICP.',
  ],
  workspace: [
    'View target accounts, verify domain fit, and review email drafts.',
    'Select accounts to trigger outreach cycles.',
  ],
  agents: [
    'Each agent has one clear, specialized responsibility.',
    'Veritas and Warden ensure zero hallucinations.',
  ],
};

// Which page uses which tips.
export const ROUTE_KEY: Record<string, string> = {
  '/': 'home',
  '/home': 'home',
  '/welcome': 'home',
  '/command': 'command',
  '/apex': 'command',
  '/orchestrator': 'orchestrator',
  '/review': 'review',
  '/onboard': 'onboarding',
  '/company': 'onboarding',
  '/workspace': 'workspace',
  '/agents': 'agents',
  '/roster': 'agents',
};

// On these pages the buddy offers help if you do nothing for 30 seconds.
export const HELP_ROUTES = ['home', 'onboarding', 'command', 'review'];

// When you click a button or link whose text matches, the buddy reacts.
export const CLICK_LINES: [RegExp, string, string?][] = [
  [/^approve/i, 'Approved. Nothing leaves without your OK.', 'happy'],
  [/^skip/i, 'Skipped. No problem.', 'idle'],
  [/^go\b/i, 'On it. Let me get the team.', 'happy'],
  [/start for free|get started|create business|start run/i, 'Great choice. Initializing your team.', 'happy'],
  [/dispatch|send/i, 'Verified and sent safely.', 'happy'],
];

export const LOOKS = null;
