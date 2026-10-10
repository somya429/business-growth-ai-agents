import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--paper)',
        paper: 'var(--paper)',
        border: 'var(--ink)',
        text: 'var(--ink)',
        ink: 'var(--ink)',
        'ink-deep': 'var(--ink-deep)',
        'ink-2': 'var(--ink-2)',
        muted: 'var(--ink-2)',
        accent: 'var(--accent)',
        'accent-text': 'var(--accent-text)',
        tint: 'var(--tint)',
        line: 'var(--line)',
        verified: '#2A7F5F',
        warning: '#A8680F',
        danger: '#A12D0A',
      },
      fontFamily: {
        display: ['Bricolage Grotesque', 'sans-serif'],
        sans: ['Hanken Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        serif: ['Bricolage Grotesque', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0px',
        btn: '999px',
        card: '0px',
        pill: '999px',
      },
      letterSpacing: {
        kicker: '0.09em',
        kickerWide: '0.12em',
        serifHeading: '-0.03em',
      },
    },
  },
  plugins: [],
} satisfies Config;
