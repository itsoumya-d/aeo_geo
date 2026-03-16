# Deployment Guide

## Overview

This project deploys as:

- Frontend on Vercel
- Backend on Supabase

The frontend is a Vite SPA. `vercel.json` configures the Vercel framework preset, build settings, security headers, and SPA rewrites for nested routes like `/dashboard` and `/settings`.

## 1. Configure Vercel

Import the repository into Vercel and confirm these project settings:

- Framework Preset: `vite`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

These settings are also declared in `vercel.json`.

## 2. Add Vercel Environment Variables

Add these in Vercel Project Settings -> Environment Variables:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_PADDLE_CLIENT_TOKEN=
VITE_PADDLE_ENVIRONMENT=production
VITE_PADDLE_STARTER_PRICE_ID=
VITE_PADDLE_PRO_PRICE_ID=
VITE_PADDLE_AGENCY_PRICE_ID=
VITE_PADDLE_TOPUP_10_PRICE_ID=
VITE_PADDLE_TOPUP_50_PRICE_ID=
VITE_PADDLE_TOPUP_150_PRICE_ID=
VITE_SENTRY_DSN=
VITE_MIXPANEL_TOKEN=
VITE_APP_VERSION=
```

## 3. Configure Supabase for Production

Link and migrate the production Supabase project:

```bash
supabase link --project-ref <project-ref>
supabase migration up
```

Set production secrets:

```bash
supabase secrets set GEMINI_API_KEY=...
supabase secrets set PADDLE_API_KEY=...
supabase secrets set PADDLE_WEBHOOK_SECRET=...
supabase secrets set PADDLE_STARTER_PRICE_ID=...
supabase secrets set PADDLE_PRO_PRICE_ID=...
supabase secrets set PADDLE_AGENCY_PRICE_ID=...
supabase secrets set SUPABASE_URL=...
supabase secrets set SUPABASE_ANON_KEY=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

Deploy the required functions:

```bash
supabase functions deploy manage-api-keys
supabase functions deploy manage-webhooks
supabase functions deploy analyze-content
supabase functions deploy api-v1
supabase functions deploy create-checkout
supabase functions deploy bootstrap-org
supabase functions deploy crawl-site
supabase functions deploy rewrite-content
supabase functions deploy verify-domain
supabase functions deploy process-scheduled-audits
supabase functions deploy paddle-webhook --no-verify-jwt
supabase functions deploy process-jobs --no-verify-jwt
```

## 4. Configure Production Auth URLs

In Supabase Authentication:

- Set the site URL to your Vercel production domain
- Add `https://your-domain.com/**` to allowed redirect URLs
- Add preview redirect URLs if you want Vercel preview auth support

## 5. Configure Paddle

In Paddle:

- Use live products and live price IDs for production
- Point webhooks to `https://<your-project>.supabase.co/functions/v1/paddle-webhook`

## 6. Pre-Deploy Verification

Before deploying:

```bash
npm install
npm run lint
npm test -- --run
npm run build
```

## 7. Post-Deploy Verification

After deployment, verify:

1. The landing page loads without console errors.
2. Refreshing `/dashboard` or `/settings` does not return a 404.
3. Login, signup, password reset, and invite flows redirect correctly.
4. Audit creation and results retrieval work against production Supabase.
5. Paddle checkout and webhook-driven credit updates complete successfully.
6. Sentry receives frontend errors in production.

## Notes

- Keep all privileged AI, billing, and webhook logic in Supabase Edge Functions rather than the Vercel frontend.
- If you add new third-party endpoints, update the CSP in `vercel.json`.
