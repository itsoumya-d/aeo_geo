<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Cognition AI Visibility Engine

**Is Your Brand Invisible to AI?**

Cognition is a SaaS platform that helps brands monitor and improve their visibility in Generative AI Search engines (ChatGPT, Gemini, Perplexity, Claude). It crawls your real site, reverse-engineers how LLMs perceive it, and provides a "Visibility Score".

## Features

- **Real-Time Crawling**: Uses `cheerio` + `sitemap.xml` to fetch live site structure.
- **AI-Powered Analysis**: Uses Google Gemini 1.5 Pro to analyze brand assets and content.
- **Perplexity Verification**: Live checks against Perplexity's online search to confirm citations.
- **SaaS Ready**: Integrated Billing (Stripe), User Management, and Team Invite flows.

## Try the report builder without credentials

Requires Node.js 22+ and npm. No Supabase project, AI provider, payment account, or `.env` configuration is needed for this isolated demo.

```bash
npm ci --ignore-scripts
npm run demo:reports
# Open http://127.0.0.1:5174/demo/report-templates.html
```

The demo mounts the same report template editor as `/reports/builder`. Rename the template, add/remove sections, and reorder with a drag handle (keyboard: Space, arrow keys, Space; Escape cancels). **Export JSON** downloads a portable layout; **Import JSON** restores it, replacing the current unsaved layout. Export first if you want to keep that layout.

Files contain only the template name and ordered sections. They do not contain audit results or organization identifiers. Imports validate the format/version, section types, name/title limits, and a 64 KB file limit before replacing anything. Templates need a name and 1–50 sections to save or export.

Demo saves are simulated and cleared on reload; export a JSON backup to keep your work. The demo's failure switch exercises retry without a backend. It makes no auth, provider, analytics, or billing calls, does not bypass the app's authentication, and is not included in the normal production build. In the signed-in app, **Save Template** still creates a new organization template; importing does not update an existing database row. Template exports are layouts, not PDF audit reports.

```bash
npx vitest run
npm run build:check
npx playwright install chromium
npm run test:e2e:reports
```

The dedicated Chromium suite executes create/edit/reorder/export/import, invalid-file recovery, failed-save retry, cancelled drag, repeated additions, and mobile controls with no conditional skips. CI runs it after the existing typecheck, unit-test, and build gates. The broader `test:e2e` suite remains separate; this demo does not verify real authentication, Supabase persistence/RLS, PDF generation, AI providers, payments, or live delivery.

## Setup Instructions

### 1. Prerequisites
- Node.js & npm
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed and logged in.
- A Supabase Project.
- A Google Cloud Project (for Gemini API).
- A Perplexity API Key.
- A Stripe Account.

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in:
```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Stripe (Public)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe Price IDs (Create in Stripe Dashboard → Products)
VITE_STRIPE_STARTER_PRICE_ID=price_...   # $49/mo plan
VITE_STRIPE_PRO_PRICE_ID=price_...       # $149/mo plan
VITE_STRIPE_AGENCY_PRICE_ID=price_...    # $399/mo plan
```

### 3. Backend Setup (Supabase)

1. **Deploy Migrations**:
   ```bash
   supabase link --project-ref your-project-id
   supabase migration up
   ```

2. **Set Edge Function Secrets**:
   These are required for the backend to function:
   ```bash
   supabase secrets set GEMINI_API_KEY="AIza..."
   supabase secrets set PERPLEXITY_API_KEY="pplx-..."
   supabase secrets set SUPABASE_URL="https://your-project.supabase.co"
   supabase secrets set SUPABASE_ANON_KEY="eyJ..."
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY="eyJ..."
   supabase secrets set STRIPE_SECRET_KEY="sk_test_..."
   supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."
   ```

3. **Deploy Edge Functions**:
   ```bash
   supabase functions deploy analyze-content
   supabase functions deploy create-checkout
   supabase functions deploy stripe-webhook
   supabase functions deploy crawl-site
   ```

### 4. Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the dev server:
   ```bash
   npm run dev
   ```

## Architecture

- **Frontend**: React, Vite, Tailwind CSS, Recharts.
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions).
- **AI**: Google Gemini (via `analyze-content` function).
- **Crawling**: Custom sitemap/HTML crawler in Edge Function.
- **Payments**: Stripe (via `create-checkout` function).

## Deployment

For the full frontend and backend deployment flow, see [DEPLOYMENT.md](./DEPLOYMENT.md).

This app is configured for **Vercel** deployment through [vercel.json](./vercel.json):
- Framework preset: `vite`
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`
- SPA routing: all app routes rewrite to `index.html`

Remember to add the required `VITE_` environment variables in Vercel and the server-side secrets in Supabase before going live.

## Documentation
- [Project Walkthrough & Architecture](./docs/production-readiness/route-inventory.md)
- [Deployment Checklist](./docs/deployment-checklist.md)
- [Implementation Task List](./docs/production-readiness/task.md)
