# Production-Readiness Audit: Cognition AI Visibility Engine

## Phase 0 — Baseline Audit
- [x] Audit existing routes in `App.tsx`
- [x] Review auth system (`ProtectedRoute`, `PublicOnlyRoute`, `AuthContext`)
- [x] Check existing production-readiness docs
- [x] Identify technical leaks and "Coming Soon" placeholders
- [x] Review test infrastructure (`ui-overflow.spec.ts`, navigation.spec.ts)
- [x] Create implementation plan

## Phase 1 — Text Overflow & Layout Fix
- [x] Fix overflow in `AuditHistory.tsx` (hostname truncation)
- [x] Fix overflow in `APIKeyManager.tsx` (key name truncation)
- [x] Fix overflow in `SearchVisibility.tsx` (query break-words)
- [x] `IntegrationsTab.tsx` already has `break-words` on URLs

## Phase 2 — Auth Architecture Refinement
- [x] Update `route-inventory.md` with current state
- [x] Fix landing page redirect logic (marketing-only for anonymous)
- [x] Verify `/reset-password` handles both modes (request + recovery)
- [x] Ensure `/auth/callback` honors `returnTo` correctly
- [x] Verify onboarding gate works correctly

## Phase 3 — Remove Technical Leaks
- [x] Create `errors.ts` with `toUserMessage(error)` and `getTechnicalErrorMessage()` utilities
- [x] Sanitize `SearchVisibility.tsx` copy (removed "latent space", "RAG systems", etc.)
- [x] Verify `ErrorBoundary.tsx` and `AppErrorBoundary.tsx` use `toUserMessage()`
- [x] Verify `LandingPage.tsx` marketing copy is clean

## Phase 4 — Screen Completion
- [x] Wire History "View Report" to `/results/:id`
- [x] Ensure `/results/:id` loads from DB (via `getAudit()`)
- [x] Verify Settings subroutes work correctly
- [x] Wire SearchVisibility into Results view
- [x] Security audit (no service role keys in frontend)
- [x] Performance check (lazy loading intact)

## Phase 5 — Core Feature Completeness
- [x] Keyword visibility: Removed "Coming Soon" for all platforms
- [x] Top-up modal: uses env-driven price IDs
- [x] Real API key management via Edge Functions
- [x] Site discovery UI (select/deselect pages)
  - *Implemented manual entry and batch import with removal capability in InputLayer.*
- [x] Recommendation persistence (done/ignored status)
  - *Implemented status field in Recommendation interface, backend update capability, and frontend UI actions.*

## Phase 6 — QA & Documentation
- [x] Update Playwright tests for new routes
- [x] Update `README.md` with correct routes
- [x] Create `deployment-checklist.md`
