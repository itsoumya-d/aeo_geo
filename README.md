# GOATAEO · AI Visibility Engine

A React and TypeScript application for website audits, AI-assisted content analysis, and report review. The repository is named `aeo_geo`; some source files and documentation retain the earlier name **Cognition AI**.

The project explores **Answer Engine Optimization (AEO)** and **Generative Engine Optimization (GEO)**. Its scores and recommendations are application-generated assessments, not independently measured search rankings or guarantees of visibility.

[Source](https://github.com/itsoumya-d/aeo_geo) · [CI](https://github.com/itsoumya-d/aeo_geo/actions/workflows/ci.yml) · [Change history](https://github.com/itsoumya-d/aeo_geo/commits/main/) · [Open pull requests](https://github.com/itsoumya-d/aeo_geo/pulls)

## What the application does

- **Audit workflow:** Discover pages, collect website content, show per-page progress and failures, apply bounded retries, and move completed audits into a results dashboard.
- **Report review:** Display overall assessments, page-level findings, platform-labeled estimates, recommendations, and content-rewrite comparisons.
- **Saved work:** Store audit records and reports through Supabase, with authentication, organization and workspace support.
- **Report layouts:** Build ordered report sections and save organization templates through the signed-in report builder.
- **Supporting integrations:** Include Supabase Edge Functions for scheduling, team invitations, API access, webhooks, and Paddle billing. These integrations require their own configuration and end-to-end verification.

### How to interpret the AI results

The active frontend calls `/api/ai-audit`, which uses Gemini. Its default model is `gemini-2.5-flash`, with a server-side `GEMINI_CHAT_MODEL` override.

Platform labels such as ChatGPT, Claude, and Perplexity identify the platforms being modeled. In this route, visibility checks ask Gemini to **simulate** how a selected platform might respond. Scores also use application heuristics and fallback values. They do not establish that independent queries were sent to those platforms or that a live citation was verified.

Separate provider integrations exist under `supabase/functions/`. Their presence in the repository does not mean that the current browser workflow uses every integration.

## Code worth exploring

- [Audit progress and recovery](./pages/AnalysisPage.tsx): discovery, crawling, bounded retries, progress updates, and error states.
- [Results routing](./pages/ResultsPage.tsx): completed report loading and redirection of unfinished audits to the analysis flow.
- [Client state](./stores/auditStore.ts): audit state managed with Zustand.
- [AI request service](./services/geminiService.ts): server requests, timeouts, and retry handling.
- [AI API implementation](./api/ai-audit.ts): Gemini calls, report construction, simulations, and content comparisons.
- [Crawl API implementation](./api/crawl-site.ts): sitemap/link discovery and content retrieval through Jina Reader.
- [Report builder](./components/reports/ReportBuilder.tsx): section ordering and template persistence.

## Architecture

| Area | Implementation |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router |
| Styling and interaction | Tailwind CSS, Framer Motion, Lucide, dnd-kit |
| Client state and charts | Zustand, Recharts |
| Browser-facing API | Vercel-style handlers in `api/` |
| Data and authentication | Supabase Auth and PostgreSQL |
| Additional backend workflows | Supabase Edge Functions and SQL migrations |
| Current billing integration | Paddle; legacy Stripe-named fields and code remain |
| Tests | Vitest, Testing Library, and Playwright |

The browser audit path is:

1. Create or load an audit through Supabase.
2. Discover and crawl pages through server routes.
3. Request Gemini-assisted analysis.
4. Persist the report and open the results dashboard.

## Run the frontend locally

Use **Node.js 22**, matching the checked-in CI workflow, and npm.

```bash
git clone https://github.com/itsoumya-d/aeo_geo.git
cd aeo_geo
npm ci --ignore-scripts
cp .env.example .env.local
npm run dev
```

The Vite development server uses `http://localhost:5173`.

For authentication and persisted data, configure your own Supabase project:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Use [`.env.example`](./.env.example) for optional Paddle, analytics, and monitoring variables. Authentication is unavailable without a working Supabase configuration.

**Local runtime boundary:** `npm run dev` starts Vite. The checked-in Vite configuration does not run the server handlers in `api/` or proxy them to a backend. A frontend-only run does not provide a working live audit or organization-bootstrap API. Those routes need a compatible server runtime or deployment.

## Backend and deployment configuration

The repository is configured for a Vite frontend and server routes on Vercel, with Supabase for authentication, persistence, and additional backend functions.

In addition to the public Supabase variables, the active Vercel API routes read these **server-only** variables:

- `GEMINI_API_KEY` for AI analysis. `GOOGLE_API_KEY` is an alternate key variable supported by the handler.
- `GEMINI_CHAT_MODEL` as an optional model override.
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` for organization bootstrap.

Never give privileged keys a `VITE_` prefix: Vite-prefixed values can be exposed to the browser. Use your own configuration and keep secrets out of source control.

For Supabase-backed workflows, apply and review the repository's [migrations](./supabase/migrations), configure function-specific secrets, and deploy the functions needed by your intended features. Current billing uses Paddle configuration and `paddle-webhook`; the old Stripe-based setup in earlier project documentation should not be treated as the current billing path.

[DEPLOYMENT.md](./DEPLOYMENT.md) and [vercel.json](./vercel.json) provide the broader deployment configuration. The server-route variables listed above are required in the server runtime as well; configuring only Supabase function secrets does not configure Vercel API routes.

A successful static build does not verify authentication, provider access, crawling, billing, or database policies. Validate those flows against the target deployment before relying on them.

## Testing and verification

```bash
# TypeScript check; the "lint" script is tsc --noEmit
npm run lint

# Unit and component tests
npm test -- --run

# Frontend production build
npm run build

# Browser tests, after installing the required Playwright browsers
npm run test:e2e
```

The [CI workflow](./.github/workflows/ci.yml) installs dependencies, checks TypeScript, runs Vitest, and builds the frontend on Node.js 22. The [main-branch run for 2941ced](https://github.com/itsoumya-d/aeo_geo/actions/runs/34338373525) passed on **9 September 2026**.

Playwright suites are present, but the main CI workflow does not run them. Their configuration includes a test authentication bypass, so browser test results should not be read as evidence of real authentication, production authorization, or live third-party services.

## Work under review

As checked on **10 October 2026**, these changes are open pull requests and are **not part of main**:

- [Report-template portability and credential-free demo, PR #3](https://github.com/itsoumya-d/aeo_geo/pull/3): JSON layout import/export, an isolated demo, and dedicated browser coverage. See the PR branch's README for its commands; they are not available on main.
- [Crawl-request validation, PR #4](https://github.com/itsoumya-d/aeo_geo/pull/4): request validation before upstream dispatch.
- [Broader platform implementation, PR #1](https://github.com/itsoumya-d/aeo_geo/pull/1): additional features and interface changes on a separate branch.

## Project history and attribution

Repository owner: [Soumya Debnath / itsoumya-d](https://github.com/itsoumya-d).

The project history includes multiple contributors and AI-assisted development tools. The [commit history](https://github.com/itsoumya-d/aeo_geo/commits/main/) and linked pull requests record individual changes; repository ownership is not a claim of sole authorship.

Google Gemini is an external AI service used by the application. Provider and development-tool names describe dependencies, modeled platforms, or tooling; they should not be interpreted as project authorship or endorsement.

No project-level license is currently included in this repository. Dependency licenses and any applicable third-party notices remain separate; this README does not grant a new license.

