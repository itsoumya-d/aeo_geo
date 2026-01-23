## Project Summary
Cognition AI is a market-leading AI Visibility Engine (GEO/AEO tool) that helps businesses understand and improve how they appear in LLM responses (ChatGPT, Gemini, Claude, Perplexity). It uses real-time crawling and vector space analysis to reverse-engineer AI perceptions.

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Recharts, Zustand.
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Storage).
- **AI**: Google Gemini 1.5 Pro (via Supabase Edge Functions).
- **Integrations**: Firecrawl (Crawling), Stripe (Payments), Slack/Webhooks (Integrations).

## Architecture
- **Pages**: `/` (Landing), `/dashboard` (Analysis), `/settings`, `/history`.
- **Components**: Modular dashboard tabs, animated UI elements, enterprise-ready settings.
- **Services**: `geminiService` for AI logic, `supabase` for DB/Auth, `crawlService` for scraping.
- **State**: Zustand stores for audit data and UI state.

## User Preferences
- **Aesthetics**: High-contrast dark theme, distinctive typography (Space Grotesk), smooth Framer Motion animations.
- **Functional**: Direct, concise communication, no unnecessary code comments.

## Project Guidelines
- Use React Server Components where possible (though this is a Vite SPA, keep components modular).
- Follow security best practices for API keys and Supabase RLS.
- Maintain a "Market-Leading" premium aesthetic in all UI changes.

## Common Patterns
- **AI Integration**: Always use server-side Edge Functions for AI calls to protect keys and handle rate limiting.
- **UI Consistency**: Use `font-display` (Space Grotesk) for headers and `font-sans` (Inter) for body text.
