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

For a step-by-step guide on deploying both the backend (Supabase) and frontend (Vercel), please verify the [Deployment Guide](./DEPLOYMENT.md).

This app is configured for **Vercel** deployment (see `vercel.json`).
 Simply import the repository into Vercel and it should auto-detect Vite.
 Remember to add the `VITE_` environment variables in Vercel.

## Documentation
- [Project Walkthrough & Architecture](./walkthrough.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Implementation Task List](./task.md)
