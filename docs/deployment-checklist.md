# Deployment Checklist

## 1. Environment Variables

Ensure these variables are set in your production environment (e.g., Vercel, Netlify, Docker).

### Frontend (VITE_* prefix)

| Variable | Description | Required |
|---|---|:---:|
| `VITE_SUPABASE_URL` | Your Supabase project URL | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Public anonymous key | ✅ |
| `VITE_PADDLE_CLIENT_TOKEN` | Paddle client-side token | ✅ |
| `VITE_PADDLE_ENVIRONMENT` | `sandbox` or `production` | ✅ |
| `VITE_PADDLE_STARTER_PRICE_ID` | Price ID for Starter Plan | ✅ |
| `VITE_PADDLE_PRO_PRICE_ID` | Price ID for Pro Plan | ✅ |
| `VITE_PADDLE_AGENCY_PRICE_ID` | Price ID for Agency Plan | ✅ |
| `VITE_PADDLE_TOPUP_10_PRICE_ID` | Price ID for $9 Top-up | ✅ |
| `VITE_PADDLE_TOPUP_50_PRICE_ID` | Price ID for $39 Top-up | ✅ |
| `VITE_PADDLE_TOPUP_150_PRICE_ID` | Price ID for $99 Top-up | ✅ |
| `VITE_SENTRY_DSN` | Sentry error tracking DSN | Recommended |
| `VITE_MIXPANEL_TOKEN` | Mixpanel analytics token | Optional |
| `VITE_APP_VERSION` | App version displayed in sidebar | Optional |

### Edge Function Secrets (Supabase Dashboard)

| Variable | Description | Required |
|---|---|:---:|
| `PADDLE_API_KEY` | Paddle server-side API key | ✅ |
| `PADDLE_WEBHOOK_SECRET` | Paddle webhook signature secret | ✅ |
| `PADDLE_STARTER_PRICE_ID` | Server-side Starter price ID (for webhook credit provisioning) | ✅ |
| `PADDLE_PRO_PRICE_ID` | Server-side Pro price ID | ✅ |
| `PADDLE_AGENCY_PRICE_ID` | Server-side Agency price ID | ✅ |
| `GEMINI_API_KEY` | Google Gemini API key for analysis | ✅ |

## 2. Supabase Edge Functions

Deploy the following functions using `supabase functions deploy`:

```bash
# Functions that verify JWT (user-authenticated)
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

# Webhook handlers (external incoming, no JWT)
supabase functions deploy paddle-webhook --no-verify-jwt

# Cron/scheduled jobs (no JWT)
supabase functions deploy process-jobs --no-verify-jwt
```

## 3. Auth Configuration (Supabase Dashboard)

1. **Redirect URLs**: Add your production domain to the allowed redirect URLs in Authentication -> URL Configuration.
   - `https://your-production-domain.com/**`
2. **Email Templates**: Customize the "Reset Password" and "Invite User" email templates.
3. **SMTP**: Configure a custom SMTP server (Resend, SendGrid, etc.) for better deliverability.

## 4. Database & Storage

1. **RLS Policies**: Ensure Row Level Security is enabled on all tables.
2. **Storage Buckets**: Ensure `audit-assets` bucket exists and is public (or signed URL capable).
3. **Indexes**: Verify DB indexes for `audits` (on `organization_id` and `created_at`) and `webhooks` are active.

## 5. Third-Party Integrations

- **Paddle**: Configure webhooks in Paddle Dashboard pointing to `https://<your-project>.supabase.co/functions/v1/paddle-webhook`. Events: `subscription.created`, `subscription.updated`, `subscription.canceled`, `transaction.completed`, `transaction.payment_failed`.
- **Sentry**: Create a project at sentry.io and add the DSN to `VITE_SENTRY_DSN`.
- **Google Search Console**: Verify domain ownership if using GSC integration.

## 6. Build & Verify

```bash
npm run build:check    # Runs tsc --noEmit && vite build
npm run test:e2e       # Runs Playwright E2E tests
```
