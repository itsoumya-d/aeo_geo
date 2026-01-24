# Technical Architecture Document

## System Overview

```
Frontend (React 19) → Supabase (Auth + DB) → Edge Functions → AI Providers
```

## Core Components

### Frontend
- **React 19** + TypeScript
- **Vite** build system
- **Tailwind CSS** + design tokens
- **Framer Motion** animations
- **Recharts** visualizations

### Backend (Supabase)
- PostgreSQL + pgvector
- Row Level Security (RLS)
- 13 Edge Functions (Deno)
- Real-time subscriptions

### AI Layer
- Gemini 2.0 Flash (primary)
- text-embedding-004
- Claude/GPT-4 via llm-client.ts

## Data Flow

```
User Request → Edge Function → Rate Limit Check → AI Analysis → Store → Return
```

## Security
- JWT auth via Supabase
- Anti-escalation triggers
- Per-org rate limiting
- Encrypted API keys

## Deployments
- Frontend: Vercel
- Backend: Supabase Cloud
- Monitoring: Sentry + Mixpanel
