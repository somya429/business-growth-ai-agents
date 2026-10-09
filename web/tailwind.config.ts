import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        border: 'var(--border)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        verified: 'var(--verified)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
      },
      fontFamily: {
        serif: ['Fraunces', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '2px',
        btn: '2px',
        card: '4px',
      },
      letterSpacing: {
        kicker: '0.18em',
        kickerWide: '0.2em',
        serifHeading: '-0.02em',
      },
    },
  },
  plugins: [],
} satisfies Config;
