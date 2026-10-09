# Verity — Growth, verified

> A business-agnostic AI growth team: agents find leads, write outreach and follow up; every claim is checked against the business's own documents; a human approves before anything is sent.

This repository contains the client-facing marketing and interactive demonstration website for **Verity**.

---

## Design System & Tokens

Built with an editorial, minimalist aesthetic:
- **Palette**:
  - Background: `#FAF8F4` (Ivory)
  - Surface: `#FFFFFF`
  - Border: `#E6E1D6` (Hairline)
  - Text: `#1A1C21` (Ink)
  - Muted: `#6B6F7B`
  - Accent: `#8F7036` (Deep Gold)
  - Status: `#2A7F5F` (Verified), `#A8680F` (Warning), `#C0432F` (Danger)
- **Typography**:
  - Headings, Numerals & Agent Names: **Fraunces** (weight 300, tracking -0.02em)
  - Body & UI: **Inter** (400/500)
- **Geometry**:
  - Cards: `4px` border radius
  - Buttons, Inputs, Chips: `2px` border radius (strictly no pills)
- **Motion**:
  - Slow, purposeful fade-up entrances (900ms, cubic-bezier `[0.22, 1, 0.36, 1]`)
  - Ambient hero glow drift
  - Dynamic trust score recalculation sweep
  - Full respect for `prefers-reduced-motion`

---

## Pages & Features

1. **Home (`/`)**: Hero with warm glow, 8-agent execution pipeline strip, 3 core pillars, live draft verification card with trust score count-up, and direct "Work with Agents" action.
2. **Autonomous Growth Studio (`#/workspace`)**: Real-time multi-agent execution pipeline on any target company (Anthropic, Stripe, Datadog, etc.), persona detection, live outreach generation, CRM sync, and **authorized Resend email agent dispatch**.
3. **How it works (`#/how`)**: 5 structured operational steps (Onboard, Research, Draft, Verify, Approve) and 3 plain-code system safeguards.
4. **Agents (`#/agents`)**: Roster of 8 specialized AI agents (Atlas, Scout, Cadence, Quill, Muse, Veritas, Echo, Sage) + 2 deterministic Rules Engines (Warden, Courier).
5. **Trust (`#/trust`)**: Veritas Trust Auditor interactive desk featuring a 200px animated conic-gradient score ring and live flag resolution (Accept: +12, Dismiss: +6, Reset).
6. **Industries (`#/industries`)**: Verification cards across B2B software, E-commerce, Local services, and custom business onboarding.

---

## Local Development

### Requirements
- Node.js 18+
- npm or pnpm

### Installation & Run

```bash
# Navigate to web directory
cd web

# Install dependencies
npm install

# Start development server
npm run dev
```

The site will be available at `http://localhost:5173`.

### Running Tests

```bash
npm test
```

### Production Build

```bash
npm run build
```

---

## Deployment Guide (HashRouter)

Verity utilizes `HashRouter` (`#/how`, `#/agents`, `#/trust`, `#/industries`, `#/contact`), allowing static hosting across all platforms without server-side rewrite rules.

### Deploying to Vercel

```bash
npm run build
npx vercel --prod dist
```

### Deploying to Netlify

```bash
npm run build
npx netlify deploy --prod --dir=dist
```

### Deploying to GitHub Pages

1. Build the bundle:
   ```bash
   npm run build
   ```
2. Push the contents of the `dist/` directory to your repository's `gh-pages` branch.
