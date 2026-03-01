# Route & Link Inventory (Production Ready)

## Current Routes (from `App.tsx`)

| Route | Component | Auth | Status |
|---|---|---:|---|
| `/` | `components/LandingPage.tsx` | Public | ✅ Redirects auth users to `/dashboard` |
| `/login` | `pages/auth/LoginPage` | PublicOnly | ✅ Full login flow implemented |
| `/signup` | `pages/auth/SignupPage` | PublicOnly | ✅ Full signup flow implemented |
| `/reset-password` | `pages/auth/ResetPasswordPage` | Public | ✅ Handles request and recovery modes |
| `/auth/callback` | `pages/auth/AuthCallbackPage` | Public | ✅ Honors `returnTo` correctly |
| `/dashboard` | `pages/DashboardPage` | Protected | ✅ Fully implemented |
| `/onboarding` | `pages/OnboardingPage` | Protected | ✅ Gates access to dashboard |
| `/analysis/:id` | `pages/AnalysisPage` | Protected | ✅ Implemented |
| `/results/:id` | `pages/ResultsPage` | Protected | ✅ Implemented (loads from DB) |
| `/history` | `pages/HistoryPage` | Protected | ✅ Wired to results view |
| `/settings` | `pages/SettingsPage` | Protected | ✅ Subroutes implemented |
| `/settings/billing` | `pages/SettingsPage` | Protected | ✅ Implemented |
| `/settings/integrations` | `pages/SettingsPage` | Protected | ✅ Implemented |
| `/help` | `pages/HelpCenter` | Public | ✅ Sanitized copy |
| `/docs/api` | `components/docs/APIDocs` | Public | ✅ Sanitized copy |
| `/reports/builder` | `components/reports/ReportBuilder` | Protected | ✅ Implemented |
| `/terms` | `pages/legal/TermsPage` | Public | ✅ Implemented |
| `/privacy` | `pages/legal/PrivacyPage` | Public | ✅ Implemented |
| `*` | `pages/NotFoundPage` | Public | ✅ Catch-all 404 implemented |

## Previous Issues Resolved

- **Landing Page Redirect**: Now redirects authenticated users to `/dashboard`.
- **Auth Callback**: Now correctly handles post-login redirection.
- **404s**: Terms, Privacy, and Reset Password routes are now implemented.
- **Navigation**: Components use `useNavigate` instead of `window.location.href`.
