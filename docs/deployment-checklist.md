# Deployment Checklist

## 1. Environment Variables

Ensure these variables are set in your production environment such as Vercel.

### Frontend (`VITE_*` prefix)

| Variable | Description | Required |
|---|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Public anonymous key | Yes |
| `VITE_PADDLE_CLIENT_TOKEN` | Paddle client-side token | Yes |
| `VITE_PADDLE_ENVIRONMENT` | `sandbox` or `production` | Yes |
| `VITE_PADDLE_STARTER_PRICE_ID` | Price ID for Starter plan | Yes |
| `VITE_PADDLE_PRO_PRICE_ID` | Price ID for Pro plan | Yes |
| `VITE_PADDLE_AGENCY_PRICE_ID` | Price ID for Agency plan | Yes |
| `VITE_PADDLE_TOPUP_10_PRICE_ID` | Price ID for the small top-up | Yes |
| `VITE_PADDLE_TOPUP_50_PRICE_ID` | Price ID for the medium top-up | Yes |
| `VITE_PADDLE_TOPUP_150_PRICE_ID` | Price ID for the large top-up | Yes |
| `VITE_SENTRY_DSN` | Sentry frontend DSN | Recommended |
| `VITE_MIXPANEL_TOKEN` | Mixpanel analytics token | Optional |
| `VITE_APP_VERSION` | Version shown in the UI | Optional |

### Edge Function Secrets (Supabase)

| Variable | Description | Required |
|---|---|---|
| `PADDLE_API_KEY` | Paddle server-side API key | Yes |
| `PADDLE_WEBHOOK_SECRET` | Paddle webhook signature secret | Yes |
| `PADDLE_STARTER_PRICE_ID` | Starter price ID for webhook provisioning | Yes |
| `PADDLE_PRO_PRICE_ID` | Pro price ID for webhook provisioning | Yes |
| `PADDLE_AGENCY_PRICE_ID` | Agency price ID for webhook provisioning | Yes |
| `GEMINI_API_KEY` | Gemini API key for analysis | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anon key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |

## 2. Supabase Edge Functions

Deploy the following functions:

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

## 3. Auth Configuration

In Supabase Authentication settings:

1. Add your production URL as the site URL.
2. Add `https://your-production-domain.com/**` to allowed redirect URLs.
3. Add preview-domain redirects if you want auth to work in Vercel previews.
4. Customize reset-password and invite email templates.

## 4. Database and Storage

1. Ensure RLS is enabled on all production tables.
2. Ensure required storage buckets exist.
3. Verify indexes for `audits`, `webhooks`, and any high-traffic lookup tables.

## 5. Third-Party Integrations

1. Point Paddle webhooks to `https://<your-project>.supabase.co/functions/v1/paddle-webhook`.
2. Add the production Sentry DSN to Vercel.
3. Verify any Google Search Console or external integration credentials.

## 6. Build and Verify

```bash
npm install
npm run lint
npm test -- --run
npm run build
```
