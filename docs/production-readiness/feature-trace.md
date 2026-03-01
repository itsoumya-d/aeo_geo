# Feature Trace (UI → Service → Edge Function → DB)

This document maps each launch-critical feature from user action through the codepath and persistence layer, and notes current gaps.

## 1) Site Discovery

**UI**
- Current: discovery happens during analysis kickoff (`App.tsx`), not exposed as a selectable list before analysis.

**Service**
- `services/geminiService.ts` → `discoverSiteStructure(url)`
- calls `services/crawlService.ts` → `discoverLinks(url)`

**Edge Function**
- `supabase/functions/crawl-site/index.ts` with `action: 'MAP'`

**DB**
- None (discovery results are client state only)

**Gaps**
- No page selection UI (select/deselect) prior to analysis.
- No persistence of discovered pages per audit.

## 2) Analysis Workflow (Audit → Crawl → Analyze)

**UI**
- Current: initiated via `Dashboard` → `InputLayer` → `onStartAnalysis` passed from `App.tsx`.
- Results are rendered inside `Dashboard` tabs using in-memory Zustand `report`.

**Services**
- `services/supabase.ts`: `createAudit`, `createAuditPage`, `updateAudit`
- `services/crawlService.ts`: `crawlPage(url, auditPageId)` → calls Edge Function
- `services/geminiService.ts`: `analyzeBrandAssets(...)` → `supabase.functions.invoke('analyze-content')`

**Edge Functions**
- `supabase/functions/crawl-site/index.ts` (MAP/SCRAPE)
- `supabase/functions/analyze-content/index.ts` (DISCOVER/ANALYZE/REWRITE/CHECK_VISIBILITY/SANDBOX_COMPARE)

**DB**
- `audits`, `audit_pages`, `page_contents`

**Gaps**
- No `/analysis/:id` progress route.
- No `/results/:id` DB-backed results route (refresh loses results).
- Client currently passes `llmProvider` to server (must be server-owned).

## 3) Results Rendering

**UI**
- Current: `components/Dashboard.tsx` renders results from Zustand `report`.
- History “View Report” does not route anywhere (HistoryPage doesn’t pass `onSelectAudit`).

**DB**
- `audits.report` stores report JSON

**Gaps**
- No results page that loads report by audit id.
- History cannot open prior audits.

## 4) SEO / Schema Audit

**Data**
- `Report.seoAudit` exists in types.
- PDF generator references `report.seoAudit`.

**Gaps**
- Not clearly exposed as a dedicated UI section in the dashboard UX (Search tab currently shows Sentinel instead).

## 5) Keyword Visibility Tracking

**UI**
- `components/SearchVisibility.tsx` exists but is not mounted anywhere.
- `components/SentinelDashboard.tsx` reads from `keyword_rankings`.

**Service**
- `services/geminiService.ts` → `checkVisibility(...)` invokes analyze-content CHECK_VISIBILITY.
- `services/supabase.ts` → `saveKeywordRanking`, `getKeywordRankings`

**DB**
- `keyword_rankings` (RLS in `008_saas_foundation.sql`)

**Gaps**
- Visibility UI not wired into the product flow.
- CHECK_VISIBILITY currently supports Perplexity only (others show “Coming Soon”).

## 6) Rewrite Simulation

**UI**
- `components/PageBreakdown.tsx`: per-recommendation rewrite simulator (calls backend, persists to DB).
- `components/AEOForge.tsx` + `components/OptimizationDashboard.tsx`: standalone rewrite simulator + library.

**Service**
- `services/geminiService.ts` → `simulateRewriteAnalysis(...)` invokes REWRITE.

**DB**
- `rewrite_simulations` (RLS in `001_initial_schema.sql`)

**Gaps**
- Some optimization UI copy is overly technical; needs sanitization.

## 7) Integrations + API Keys

**UI**
- `components/APIKeyManager.tsx` exists.
- `components/dashboard/IntegrationsTab.tsx` currently generates fake “cog_live_...” keys client-side.
- `components/IntegrationHub.tsx` includes “coming soon”/enterprise placeholders.

**Edge Functions**
- `supabase/functions/manage-api-keys/index.ts` supports create/list/rotate/revoke.
- `supabase/functions/manage-webhooks/index.ts` supports webhook mgmt.

**DB**
- `api_keys`, `integration_webhooks`

**Gaps**
- IntegrationsTab must use real Edge Functions (no fake key generation).

## 8) Billing / Stripe

**UI**
- `components/BillingDashboard.tsx` uses `create-checkout` Edge Function.
- `components/TopUpModal.tsx` uses mock `price_topup_*_mock` IDs.

**Edge Functions**
- `supabase/functions/create-checkout/index.ts`
- `supabase/functions/stripe-webhook/index.ts`

**DB**
- `organizations` (plan/credits), `billing_usage`

**Gaps**
- Top-ups must be env-configured (no mock price IDs).

