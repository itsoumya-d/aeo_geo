# Technical Implementation Leakage (Baseline)

## Provider / Model Selection Exposure (must be removed from UI)

- `components/ModelSelector.tsx`: explicit model/provider selector + emoji icons + model versions.
- `App.tsx`: status message includes model versions (e.g. “Claude 3.5 Sonnet”, “GPT-4o”, “Gemini 1.5 Pro”).
- `services/geminiService.ts`: `analyzeBrandAssets(..., llmProvider)` accepts provider selection from client.

## Infrastructure / Vendor References in User-Facing Copy

### Marketing + help copy
- `components/LandingPage.tsx`: mentions parsing HTML/Markdown, “Vector Space Analysis”, sitemap.xml, and other implementation details.
- `pages/HelpCenter.tsx`: mentions Firecrawl and model versions.
- `components/SEOHead.tsx`: meta descriptions mention “vector analysis” and platform/model details.

### Product UI
- `components/BillingDashboard.tsx`: references estimated “Gemini + Perplexity cost”.
- `components/IntegrationHub.tsx`: “Perplexity API” called out explicitly.
- `components/dashboard/IntegrationsTab.tsx`: exposes `api.cognition.ai/v1` and “production token” language.
- Various tabs use “latent space”, “vector distance”, “RAG systems”, etc. as first-order UX copy.

## Technical Error Message Leakage

- `components/ErrorBoundary.tsx`: displays raw error message and offers “Copy Error” in user UI.
- `components/AppErrorBoundary.tsx`: displays raw error message in a code block.
- Many toasts surface `error.message` directly (checkout, crawl, analysis, integrations).
- `services/crawlService.ts`: throws errors including the full URL and raw function error.
- `services/geminiService.ts`: throws raw function error messages.

## Emoji Usage (forbidden by design system)

- `components/ModelSelector.tsx`: emoji “icons” for models.
- `pages/OnboardingPage.tsx`: “You’re All Set! 🎉”
- `components/auth/AuthPage.tsx`: “★★★★★” as an icon.

