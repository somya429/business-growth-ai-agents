// GrowthX content definitions

export interface DemoGoal {
  tab: string;
  text: string;
  use: string[];
  res: string;
}

export const AG = [
  { id: 'research', n: 'Research', d: 'Finds customers' },
  { id: 'scoring', n: 'Scoring', d: 'Ranks the best leads' },
  { id: 'content', n: 'Content', d: 'Writes posts' },
  { id: 'outreach', n: 'Outreach', d: 'Writes messages' },
  { id: 'followup', n: 'Follow-up', d: 'Plans next nudges' },
  { id: 'analytics', n: 'Analytics', d: 'Shows what worked' },
];

export const DEMO_GOALS: DemoGoal[] = [
  {
    tab: 'Find customers',
    text: 'Find new customers for my B2B software company.',
    use: ['research', 'scoring', 'outreach'],
    res: 'A ranked list of businesses to contact, with a message ready for each.',
  },
  {
    tab: 'Get noticed',
    text: 'Get more people to notice our business and book consultations.',
    use: ['research', 'content'],
    res: 'Three tailored outreach angles with verified claims, ready to approve.',
  },
  {
    tab: 'Win back leads',
    text: 'Bring back high-value pipeline leads who went quiet.',
    use: ['followup', 'analytics'],
    res: 'Who to nudge today with personalized value-add context for each.',
  },
];

export const AGENTS = [
  {
    n: 'Orchestrator',
    t: 'Plans',
    p: 'Reads your goal and commands the right agents for the job.',
    ask: 'Plans that cost money or send anything',
    get: 'The right agents, coordinated for you',
  },
  {
    n: 'Research',
    t: 'Finds',
    p: 'Finds companies, decision makers, and market triggers that fit your ICP.',
    ask: 'Nothing. It only reads.',
    get: 'A verified list of targeted businesses',
  },
  {
    n: 'Scoring',
    t: 'Ranks',
    p: 'Ranks leads based on fit, buying signals, and tech stack match.',
    ask: 'Nothing. It only ranks.',
    get: 'Leads sorted from highest priority',
  },
  {
    n: 'Content',
    t: 'Writes',
    p: 'Writes posts, emails, and value pitches tuned to your brand voice.',
    ask: 'Before anything is sent',
    get: 'Precision drafts tailored to each account',
  },
  {
    n: 'Outreach',
    t: 'Reaches',
    p: 'Prepares personalized messages grounded in ground-truth facts.',
    ask: 'Every single message, before it is sent',
    get: 'A ready message for each verified lead',
  },
  {
    n: 'Follow-up',
    t: 'Nudges',
    p: 'Monitors reply signals and schedules intelligent touchpoints.',
    ask: 'Before any follow-up goes out',
    get: 'Clear queue of who to nudge today',
  },
  {
    n: 'Analytics',
    t: 'Learns',
    p: 'Tracks response rates, attribution, and optimizes the playbook.',
    ask: 'Nothing. It only reports.',
    get: 'A concise summary of conversion results',
  },
];

export const CHORES = [
  'Research prospective accounts',
  'Rank the highest-fit leads',
  'Audit factual claims',
  'Draft personalized outreach',
  'Remember follow-up schedules',
  'Verify compliance and anti-spam',
];

export const STEPS = [
  ['Tell us about your business', 'Answer a few quick questions to define your ICP, offer, and brand voice.'],
  ['Say your growth objective', 'Type your goal in plain words, like "find enterprise healthcare leads".'],
  ['Your AI team gets to work', 'Verity picks the agents your goal needs and executes research and drafts.'],
  ['You review and approve', 'You see the result in Governance Desk. Nothing goes out until you say yes.'],
];

export const BIZ_PLACEHOLDER: Record<string, string> = {
  'Food and drinks': 'We bake fresh bread and cakes',
  'Shop or store': 'We sell school bags and gifts',
  'Local service': 'We clean offices and commercial properties',
  'Online business': 'We build custom developer tools',
  'Health and wellness': 'We run an occupational health clinic',
  'Education and coaching': 'We train enterprise sales teams',
};

const has = (v: any, x: any) => Array.isArray(v) && v.indexOf(x) > -1;
const hasAny = (v: any, xs: any[]) => Array.isArray(v) && xs.some((x) => has(v, x));

export interface OnboardingQuestion {
  id: string;
  kind: 'text' | 'one' | 'many' | 'long';
  label: string;
  sec: string;
  q: string;
  hint?: string;
  ph?: string | ((a: Record<string, any>) => string);
  opts?: (string | { v: string; s?: string })[];
  max?: number;
  optional?: boolean;
  when?: (a: Record<string, any>) => boolean;
}

export const QUESTIONS: OnboardingQuestion[] = [
  {
    id: 'name',
    kind: 'text',
    label: 'Business',
    sec: 'About you',
    q: 'What is your business called?',
    hint: 'You can change this later.',
    ph: 'e.g. Acme Growth Technologies',
  },
  {
    id: 'type',
    kind: 'one',
    label: 'Industry',
    sec: 'About your business',
    q: 'What kind of business is it?',
    hint: 'Pick the closest category.',
    opts: [
      'B2B Software & SaaS',
      'Professional & Agency Services',
      'Manufacturing & Supply Chain',
      'Local service',
      'Online business',
      'Healthcare & Clinics',
      'Something else',
    ],
  },
  {
    id: 'typeOther',
    kind: 'text',
    label: 'Type, in your words',
    sec: 'About your business',
    q: 'Tell us in a few words.',
    ph: 'e.g. Commercial industrial cleaning',
    when: (a) => a.type === 'Something else',
  },
  {
    id: 'offer',
    kind: 'long',
    label: 'What you do',
    sec: 'About your business',
    q: 'What do you sell or offer?',
    hint: 'One or two lines is enough.',
    ph: (a) => BIZ_PLACEHOLDER[a.type] || 'We help enterprise teams automate compliance and customer acquisition...',
  },
  {
    id: 'reach',
    kind: 'one',
    label: 'Geography',
    sec: 'Your customers',
    q: 'Where do your customers come from?',
    opts: ['My town or city', 'All over the country', 'Anywhere in the world'],
  },
  {
    id: 'city',
    kind: 'text',
    label: 'Town or city',
    sec: 'Your customers',
    q: 'Which town or city?',
    ph: 'e.g. Austin, TX or London',
    when: (a) => a.reach === 'My town or city',
  },
  {
    id: 'who',
    kind: 'many',
    label: 'Target ICP',
    sec: 'Your customers',
    q: 'Who do you want as target customers?',
    hint: 'Pick all that fit.',
    opts: ['Small businesses (SMBs)', 'Mid-market companies', 'Enterprise accounts', 'Everyday consumers'],
  },
  {
    id: 'whoKind',
    kind: 'text',
    label: 'Specific roles/verticals',
    sec: 'Your customers',
    q: 'Which verticals or titles?',
    ph: 'e.g. VP Sales at Logistics companies, CFOs, clinic owners',
    when: (a) => has(a.who, 'Small businesses (SMBs)') || has(a.who, 'Mid-market companies') || has(a.who, 'Enterprise accounts'),
  },
  {
    id: 'goals',
    kind: 'many',
    max: 2,
    label: 'Goals',
    sec: 'Your goal',
    q: 'What do you want most right now?',
    hint: 'Pick up to 2.',
    opts: [
      'Find new high-fit leads',
      'Get more meeting bookings',
      'Verify claims before sending',
      'Re-engage stalled accounts',
      'Understand pipeline analytics',
    ],
  },
  {
    id: 'where',
    kind: 'many',
    label: 'Channels',
    sec: 'Your channels',
    q: 'Where do you want to reach them?',
    hint: 'Pick all that fit.',
    opts: ['Email', 'LinkedIn', 'Phone / Direct', 'Not sure yet'],
    when: (a) => hasAny(a.goals, ['Find new high-fit leads', 'Get more meeting bookings']),
  },
  {
    id: 'tone',
    kind: 'one',
    label: 'Brand Voice',
    sec: 'Your voice',
    q: 'How should your messages sound?',
    hint: 'Your AI team will craft outreach adhering to this tone.',
    opts: [
      { v: 'Consultative and metrics-driven', s: '"Hello, we noticed your team is scaling..."' },
      { v: 'Friendly and direct', s: '"Hi! We would love to share how teams like yours..."' },
      { v: 'Professional and executive', s: '"Dear Colleague, regarding your growth initiatives..."' },
      { v: 'Short and crisp', s: '"We audit outreach for B2B teams. Open to a 5-min look?"' },
    ],
  },
  {
    id: 'budget',
    kind: 'one',
    optional: true,
    label: 'Budget',
    sec: 'Preferences',
    q: 'Target monthly outreach volume or scale?',
    hint: 'You can skip this.',
    opts: ['Getting started (< 100 accounts)', 'Growth (100 - 500 accounts)', 'Scale (500+ accounts)'],
  },
  {
    id: 'never',
    kind: 'long',
    optional: true,
    label: 'Never do',
    sec: 'Governance constraints',
    q: 'Anything your AI team should NEVER say or claim?',
    hint: 'Warden will enforce these rules strictly.',
    ph: 'e.g. Never mention pricing without approval, never guarantee 100% returns, never contact competitors...',
  },
];
