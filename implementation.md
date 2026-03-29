# 🚀 COGNITION AI — MASTER IMPLEMENTATION PLAN
**Platform:** AEO · GEO · SEO Intelligence SaaS
**Stack:** React 19 · TypeScript · Tailwind CSS · Supabase Edge Functions · Gemini API (only)
**Goal:** Category-defining, globally competitive AEO/GEO/SEO platform — industry domination
**Last Updated:** March 2026 | **Status:** Active Development

---

## 📋 PRIORITY LEGEND
- 🔴 **CRITICAL** — This week. Core product/cost/UX issue.
- 🟠 **HIGH** — Next 2 weeks. Major competitive gap.
- 🟡 **MEDIUM** — Next month. Meaningful improvement.
- 🟢 **LOW** — Roadmap. Competitive edge feature.

---

## 🏆 EXECUTIVE SUMMARY & MARKET POSITION

### What Cognition AI Is
Cognition is a full-stack AI Visibility Intelligence SaaS that crawls websites, runs Gemini-powered analysis, and gives brands a **Visibility Score** across AEO (Answer Engine Optimization), GEO (Generative Engine Optimization), and traditional SEO — all from one platform, at a fraction of competitor pricing.

### Market Opportunity Window (2026)
- **TAM:** $5B by 2027 — AI visibility is the fastest-growing segment in martech
- **The Gap:** Profound ($499+/mo), Peec AI (€89+/mo), LLM Pulse (€49+/mo), Semrush One (enterprise-only) — the **$49–$149/mo tier for growing teams is entirely unserved**
- **Your Unfair Advantage:** Direct Vector Analysis (semantic shift measurement) — NO competitor does this
- **Cost Advantage:** Gemini-only architecture delivers analysis 10–20x cheaper than competitors using OpenAI/Claude

---

## 🌍 SECTION 1 — TOP 10 COMPETITOR DEEP DIVE

> 👉 Research sources: aiclicks.io · llmpulse.ai · seranking · scalenut

| # | Competitor | Pricing | Core Strength | Critical Weakness | Our Edge |
|---|-----------|---------|--------------|------------------|----------|
| 1 | **Profound** | $499–$3k+/mo | Enterprise AEO, $58.5M raised | No mid-market plan, no vector analysis | 10x cheaper, Vector Shift Analysis |
| 2 | **Peec AI** | €89–€299/mo | VC-funded $29M Series A, AI tracking | 25 prompts on entry plan, add-on pricing | More prompts, all AI models included |
| 3 | **LLM Pulse** | €49–€299/mo | Bootstrapped, white-label, 5 AI models | No crawling, no content optimization | Full crawl + rewrite + vector in one |
| 4 | **Semrush One** | $299+/mo | 100M+ prompts tracked, trusted brand | Legacy SEO DNA, not AI-native | AI-native architecture, faster insights |
| 5 | **Ahrefs Brand Radar** | $399+/mo | Backlink giant, trusted brand | SEO-first, GEO as afterthought | Purpose-built for GEO/AEO from day one |
| 6 | **AthenaHQ** | Custom/Enterprise | Multi-engine AI visibility | Enterprise-only, no self-serve | Self-serve from $49/mo |
| 7 | **Surfer SEO** | $89–$399/mo | Content optimization, NLP | No AEO/GEO tracking, weak AI | Full AEO+GEO+SEO in one platform |
| 8 | **SE Ranking AI Visibility** | $65–$259/mo | Traditional SEO + AI Overview | Limited GEO features, no vector | Deeper AI analysis via Gemini embeddings |
| 9 | **AEO Engine** | Custom | AI agents, community seeding | No transparent pricing, complex onboarding | Instant self-serve, transparent pricing |
| 10 | **Clearscope** | $189–$499/mo | Topical authority, NLP scoring | No AEO/GEO at all | We cover all three: SEO + AEO + GEO |

### What Competitors Offer That We Must Match or Beat
- ✅ Track brand mentions across ChatGPT, Gemini, Perplexity, Google AI Overviews (5+ engines)
- ✅ Prompt monitoring dashboard (track 50–1000 custom queries)
- ✅ Citation tracking (which pages get cited, by which AI engine)
- ✅ Competitor comparison / benchmark view
- ✅ Schema markup analysis and suggestions
- ✅ White-label reports (for agencies)
- ✅ Scheduled automated audits
- ✅ API access for power users / enterprise
- ❌ **None offer Vector Shift Analysis** — this is our moat

---

## 🧠 SECTION 2 — FULL CODEBASE AUDIT

### 2.1 Architecture Map
```
Frontend (React 19 + Vite + TypeScript + Tailwind + Framer Motion)
├── App.tsx                  # Root router ✅
├── pages/
│   ├── AnalysisPage.tsx     # Crawl + AI analysis orchestrator ✅
│   ├── ResultsPage.tsx      # Dashboard loader ✅
│   ├── DashboardPage.tsx    # Main app entry ✅
│   ├── OnboardingPage.tsx   # User onboarding ✅
│   ├── HistoryPage.tsx      # Audit history ✅
│   ├── PricingPage.tsx      # Pricing ✅
│   └── SettingsPage.tsx     # Settings ✅
├── components/
│   ├── LandingPage.tsx      # Marketing landing ⚠️ dark sections need white
│   ├── Dashboard.tsx        # Multi-tab shell ✅
│   ├── InputLayer.tsx       # URL input + trigger ✅
│   ├── dashboard/           # Tab components (8 tabs) ✅
│   ├── ShortcutsHelpModal   # ⚠️ dark bg-[#0F1115] — must fix
│   ├── SSOConfig.tsx        # ⚠️ dark blue/indigo gradient — must fix
│   └── TeamSettings.tsx     # ⚠️ purple gradient — must fix
├── services/
│   ├── geminiService.ts     # Calls /api/ai-audit → Edge Fn ✅
│   ├── crawlService.ts      # Calls /api/crawl-site → Edge Fn ✅
│   ├── competitorService.ts # Competitor analysis ✅
│   └── supabase.ts          # DB queries ✅
└── stores/                  # Zustand state ✅

Backend (Supabase Edge Functions — Deno)
├── analyze-content/         # Core Gemini AI engine ✅ (needs model update)
├── crawl-site/              # Web crawler (Deno fetch + cheerio) ✅
├── process-jobs/            # Background job processor ✅
├── process-scheduled-audits/# Scheduled audit runner ✅
├── rewrite-content/         # Content rewrite suggestions ✅
├── create-checkout/         # Stripe billing ✅
├── stripe-webhook/          # Payment events ✅
├── api-v1/                  # Public API endpoint ✅
├── manage-api-keys/         # API key management ✅
└── verify-domain/           # Domain ownership ✅
```

### 2.2 Identified Issues
| Issue | Location | Severity | Type |
|-------|----------|----------|------|
| Dark modal `bg-[#0F1115]` | ShortcutsHelpModal.tsx | 🔴 | UI/UX |
| Dark gradients `from-blue-900/20` | SSOConfig.tsx | 🔴 | UI/UX |
| Purple gradient on Team upsell | TeamSettings.tsx | 🟠 | UI/UX |
| LandingPage `border-white/10` sections | LandingPage.tsx | 🟠 | UI/UX |
| Gemini 2.0 Flash-Lite deprecated June 1 | analyze-content/index.ts | 🔴 | API |
| Multi-provider fallback (Claude/OpenAI) | analyze-content/index.ts | 🔴 | Cost |
| No Gemini context caching | analyze-content/index.ts | 🟠 | Cost |
| No batch processing for scheduled audits | process-scheduled-audits | 🟠 | Cost |
| Missing page-level AEO scoring | dashboard/OverviewTab | 🟠 | Feature |
| No schema markup validator | services/ | 🟠 | Feature |
| Social media presence analyzer missing | services/ | 🟠 | Feature |

---

## 💰 SECTION 3 — API COST OPTIMIZATION (CRITICAL PATH)

> 👉 Research first: https://ai.google.dev/gemini-api/docs/pricing

### Current Gemini Pricing (March 2026)
| Model | Input (per 1M tokens) | Output (per 1M tokens) | Use Case |
|-------|----------------------|----------------------|----------|
| **Gemini 2.5 Flash-Lite** | $0.10 | $0.40 | Page summaries, simple tasks |
| **Gemini 2.5 Flash** | $0.30 | $2.50 | Standard analysis, scoring |
| **Gemini 2.5 Pro** | $1.25 | $10.00 | Deep vector analysis only |
| ~~Gemini 2.0 Flash-Lite~~ | ~~deprecated~~ | ~~deprecated~~ | **SHUTDOWN June 1, 2026** |

### Cost Optimization Strategies
- **Context Caching:** Cached tokens cost 90% less than regular input — store system prompts + schema
- **Batch Processing:** 50% discount for non-time-sensitive workloads (scheduled audits)
- **Complexity Routing:** Simple queries → Flash-Lite, standard → Flash, deep analysis → Pro
- **Token Budgeting:** Truncate crawled page content to 2,000 tokens max per page before sending to Gemini
- **Result Caching:** Cache Gemini results in Supabase for 24 hours (same domain + same content hash)

### Target Cost Per Audit
| Audit Size | Current | Target |
|-----------|---------|--------|
| 5-page site | ~$0.20–0.40 | **< $0.05** |
| 20-page site | ~$0.80–1.50 | **< $0.20** |
| 50-page site | ~$2.00–4.00 | **< $0.50** |

---

## 🎨 SECTION 4 — UI/UX DESIGN SYSTEM

### 4.1 Design Language: "Clean Intelligence"
**Philosophy:** White is the primary surface. Blue is the signal. Complexity is the enemy.

**Color Palette (White + Blue Only)**
```
BACKGROUNDS
  Page background:     #FFFFFF  (pure white)
  Card background:     #F5F9FF  (faint blue-white)
  Section background:  #EEF4FB  (light blue-grey)

BLUE SYSTEM (multiple shades allowed)
  blue-50:   #EFF6FF  hover states, active backgrounds
  blue-100:  #DBEAFE  borders, dividers
  blue-200:  #BFDBFE  secondary borders
  blue-400:  #60A5FA  secondary actions
  blue-500:  #3B82F6  primary interactive elements
  blue-600:  #2563EB  primary buttons
  blue-700:  #1D4ED8  hover on primary
  blue-900:  #1E3A5F  dark text, deep CTAs

BRAND PRIMARY (keep)
  primary:       #2f8fff
  primary-hover: #2179e0

NEVER USE: dark backgrounds, purple, black panels
REPLACE ALL: bg-[#0F1115], from-blue-900, from-slate-900, bg-gray-900
```

**Typography**
- **Display:** Space Grotesk — headings, scores, key numbers
- **Body:** Inter — all paragraph text, labels, UI text
- **Mono:** Fira Code — API keys, code snippets, domain names

### 4.2 Components Requiring Dark→White Migration
| Component | Current (Wrong) | Fix To (White+Blue) |
|-----------|----------------|---------------------|
| `ShortcutsHelpModal` | `bg-[#0F1115] border-white/10` | `bg-white border-blue-100` |
| `SSOConfig` upsell card | `from-blue-900/20 to-indigo-900/20` | `bg-blue-50 border border-blue-200` |
| `TeamSettings` upsell | `from-purple-500/10 to-blue-500/10` | `bg-blue-50 border border-blue-200` |
| Landing hero sections | `border-white/10 bg-surface/45` | `bg-white border-blue-100` |
| `VectorLab` cards | `from-surface to-surface/50` | `bg-white border border-blue-100` |
| `IntegrationsTab` cards | Brand-colored dark borders | White cards with blue icon badges |
| Loading skeletons | Possibly wrong shimmer | `bg-blue-50` shimmer on white |

### 4.3 Screen-by-Screen Design Spec

**Landing Page**
- Hero: Pure white background, #2f8fff headline accent, HeroGlobe on right
- Stats bar: `bg-blue-600` with white text — social proof strip
- Feature cards: `bg-white border border-blue-100 rounded-2xl shadow-sm`
- Pricing section: `bg-blue-50` background, white cards, blue "Popular" badge
- CTA section: `bg-blue-900` (single deep blue section), white text

**Dashboard (Post-login)**
- Sidebar: `bg-white border-r border-blue-100`
- Header: `bg-white border-b border-blue-100`
- Tab content: `bg-[#F5F9FF]` page, white cards
- Score rings: Blue gradient on white SVG circles
- Data tables: White background, `border-blue-100` row dividers
- Charts: Blue palette (blue-400, blue-500, blue-600) on white canvas

**Analysis / Loading Page**
- Background: White with subtle blue radial gradient top-center
- Progress bar: Blue fill on `bg-blue-50` track
- Steps: Blue filled = complete, blue ring = current, grey = pending

**Onboarding (4-step)**
1. Enter your website URL
2. Add social media handles (optional)
3. Add up to 3 competitor domains (optional)
4. Choose primary goal (SEO / AEO / GEO / All)

Design: White cards, blue progress dots, minimal text, single focused action per step.

---

## ⚡ SECTION 5 — ANIMATION & INTERACTION SYSTEM

| Interaction | Animation | Duration | Why |
|-------------|-----------|----------|-----|
| Score number reveal | Count-up from 0 to value | 1200ms | Dopamine hit, score feels earned |
| Tab switch | Fade + subtle translate-x | 200ms | Spatial navigation clarity |
| Card hover | scale(1.005) + shadow increase | 200ms | Confirms interactivity |
| Analysis progress | Smooth bar fill + pulsing dot | Continuous | Reduces anxiety during wait |
| Page-load skeleton | Wave shimmer (blue-50 on white) | 1500ms loop | Perceived performance |
| Success states | Green checkmark pop with scale | 300ms | Satisfying confirmation |
| Error states | Gentle shake (2px, 3 cycles) | 400ms | Clear without alarming |
| Sidebar collapse | Width transition | 250ms | Smooth spatial change |
| Modal entrance | scale(0.95)+opacity-0 → scale(1)+opacity-1 | 200ms | Premium feel |
| Drawer (score explainer) | translateX from right | 350ms ease-out | Spatial context |

---

## 🤖 SECTION 6 — GEMINI-ONLY FEATURE ARCHITECTURE

> 👉 Research first: https://ai.google.dev/gemini-api/docs

### 6.1 Full Feature Map (All via Gemini API Only)

| Feature | Current Model | Target Model | Gemini Capability |
|---------|--------------|-------------|-------------------|
| Site structure discovery | DISCOVER action | Gemini 2.5 Flash-Lite | Text generation |
| Page content extraction | Crawl + Gemini | Gemini 2.5 Flash-Lite | Summarization |
| AEO score (1–100) | Gemini Flash | Gemini 2.5 Flash | Structured JSON output |
| GEO score (1–100) | Gemini Flash | Gemini 2.5 Flash | Structured JSON output |
| SEO score (1–100) | Gemini Flash | Gemini 2.5 Flash | Structured JSON output |
| Per-page summary | Gemini Flash | Gemini 2.5 Flash-Lite | Summarization |
| Content rewrite suggestions | Gemini Flash | Gemini 2.5 Flash | Text generation |
| Vector semantic analysis | Gemini embeddings | Gemini embeddings API | embedding-001 |
| Competitor gap analysis | Gemini Flash | Gemini 2.5 Flash | Comparison reasoning |
| Schema markup generation | **MISSING** | Gemini 2.5 Flash | Structured JSON output |
| Social media analysis | **MISSING** | Gemini 2.5 Flash | Text reasoning |
| Citation probability score | **MISSING** | Gemini 2.5 Flash | Reasoning |
| Entity extraction | **MISSING** | Gemini 2.5 Flash-Lite | Named entity recognition |
| AI search grounding check | Perplexity (cost!) | Gemini Grounding | Built-in Google Search |

### 6.2 Gemini Grounding (Replace Perplexity)
Use Gemini's built-in Google Search grounding to check: "Does [brand name] appear when a user asks [query]?"
- Costs $35 per 1,000 grounded queries vs Perplexity $5/1k (but eliminates separate API dependency)
- Single API, single billing, simpler architecture

### 6.3 Supabase Crawler Architecture
```
User submits URL
    ↓
[crawl-site Edge Function] — Deno fetch + cheerio
    extracts: title, meta, h1-h3, body text (max 2000 tokens per page)
    discovers: /sitemap.xml → all page URLs (max 50 pages)
    stores: crawl results in Supabase crawl_cache table (TTL: 24h, keyed by content hash)
    ↓
[analyze-content Edge Function] — reads from cache
    Gemini 2.5 Flash-Lite → per-page summary (cheap)
    Gemini 2.5 Flash → AEO/GEO/SEO scores per page + site-level
    Gemini 2.5 Flash → improvement recommendations
    Gemini embeddings → vector analysis (Pro plan only)
    stores: results in Supabase audit_results table
    ↓
Frontend reads results from Supabase real-time subscription
    shows streaming progress as pages complete
```

### 6.4 Cost Per Audit (After Optimization)
| Audit Size | Model Used | Est. Tokens | Cost |
|-----------|-----------|------------|------|
| 5-page site | Mixed Flash/Flash-Lite | ~38k | ~$0.016 |
| 20-page site | Mixed Flash/Flash-Lite | ~120k | ~$0.06 |
| 50-page site | Mixed Flash/Flash-Lite | ~280k | ~$0.14 |

With context caching (90% off system prompt) and batch API (50% off scheduled): cost drops further to ~$0.008 for 5-page, ~$0.03 for 20-page.

---

## 🏗 SECTION 7 — FRONTEND + BACKEND INTEGRATION

### Data Flow
```
User Input → DashboardPage → createAudit() → Supabase DB
           → AnalysisPage → crawlService → /api/crawl-site edge fn
           → AnalysisPage → geminiService → /api/ai-audit → analyze-content edge fn
           → Results stored in Supabase reports table
           → ResultsPage → loadReport() → Dashboard.tsx
           → 8 Tabs render from single Report object
```

### Tab → Data Source Mapping
| Tab | Data Source |
|-----|------------|
| Overview | report.overallScore, report.scores{} |
| Pages | report.pages[] per-page breakdown |
| Search | report.visibility[] AI engine citations |
| Consistency | report.consistency{} brand messaging |
| Optimization | report.recommendations[] action items |
| Benchmark | competitorService.ts competitor data |
| Sandbox (VectorLab) | Gemini embeddings semantic shift |
| Report | PDF export via html2pdf.js |

### Missing Integrations to Build
| Integration | Purpose | Priority |
|-------------|---------|----------|
| Social media analyzer | Crawl Twitter/LinkedIn, score brand consistency | 🟠 HIGH |
| Schema markup validator | Check JSON-LD, OpenGraph, Twitter cards | 🟠 HIGH |
| Google Search Console sync | Import real keyword/traffic data | 🟡 MEDIUM |
| Sitemap monitor | Alert when new pages added/removed | 🟡 MEDIUM |
| Slack/Teams webhook | Audit complete notification | 🟡 MEDIUM |

---

## 🌐 SECTION 8 — MULTILINGUAL SYSTEM

### Target Languages (Top 10 by Market)
| Priority | Language | Region | RTL? | Status |
|----------|----------|--------|------|--------|
| 1 | English | Global | No | ✅ Done |
| 2 | Spanish | Latin America + Spain | No | Needs i18n keys |
| 3 | Portuguese | Brazil | No | Needs i18n keys |
| 4 | French | France + Canada | No | Needs i18n keys |
| 5 | German | DACH | No | Needs i18n keys |
| 6 | Japanese | Japan | No | Needs i18n keys |
| 7 | Hindi | India | No | Needs i18n keys |
| 8 | Arabic | MENA | **Yes** | Needs RTL layout |
| 9 | Korean | South Korea | No | Needs i18n keys |
| 10 | Chinese (Simplified) | China | No | Needs i18n keys |

**Implementation:** i18next is already installed. Create `/public/locales/{lang}/translation.json`. Use Gemini Flash-Lite to auto-translate all strings (~$0.002 per full language set).

---

## 💰 SECTION 9 — MONETIZATION & MARKET POSITIONING

### Pricing (vs Competitors)
| Plan | Price | Audits/mo | Engines | Key Feature |
|------|-------|-----------|---------|-------------|
| **Free** | $0 | 3 | 2 | Lead capture, free tool |
| **Starter** | $49/mo | 50 | 5 | Core AEO/GEO/SEO |
| **Pro** | $149/mo | 200 | 5 + API | Vector Analysis |
| **Agency** | $399/mo | 1,000 | 5 + API | White-label + Teams |

**Positioning:** Profound $499 for what we give at $49. LLM Pulse €99 for what we include at $49. We are the best-value platform in the category.

**Positioning Statement:**
> "The only AI visibility platform that shows you exactly how to become the most-cited brand in your category — at a price every team can afford."

**Revenue Streams:**
- Primary: Monthly subscriptions (Stripe recurring)
- Secondary: Usage top-ups (credit packs for burst use)
- Tertiary: Agency white-label licensing
- Future: Developer API (per-call pricing)

---

## 📊 SECTION 10 — MASTER TASK LIST

---

### 🔴 T-01: Migrate ALL Gemini calls to 2.5 models (URGENT — blocks June 1)

> 👉 Research first: https://ai.google.dev/gemini-api/docs/models

**Problem:** `gemini-2.0-flash-lite` is deprecated. Hard shutdown **June 1, 2026** — production will break. Multi-provider fallback (Claude, OpenAI) inflates costs 40–100x per call.

**Solution:**
- Replace all `gemini-2.0-*` → `gemini-2.5-flash-lite` (summaries) or `gemini-2.5-flash` (analysis)
- Remove Claude + OpenAI fallback entirely from `providerPreference`
- Add `gemini-2.5-pro` as optional Pro-plan deep analysis only

**Files to Change:**
- `/supabase/functions/analyze-content/index.ts` — model constants + providerPreference
- `/supabase/functions/rewrite-content/index.ts` — model string
- `/services/geminiService.ts` — any client-side model references

**Implementation Steps:**
1. `grep -r "gemini-2.0\|claude-\|openai\|gpt-4" ./supabase ./services` — find all occurrences
2. Replace with correct `gemini-2.5-*` model strings based on complexity
3. In `analyze-content/index.ts` find `providerPreference` → set to `['gemini']`
4. Add routing logic: `action === 'SUMMARIZE'` → Flash-Lite, else → Flash
5. Test: `supabase functions deploy analyze-content && supabase functions invoke analyze-content`

**Expected Impact:** Prevents production outage June 1. Reduces API cost 60–80%.

---

### 🔴 T-02: Fix ShortcutsHelpModal dark background

> 👉 Research first: Modal design patterns at Linear.app, Vercel, Notion

**Problem:** `ShortcutsHelpModal.tsx` uses `bg-[#0F1115]` (near-black) — completely breaks the white+blue design. Users see a jarring dark popup in an otherwise clean white UI.

**Files:** `/components/ShortcutsHelpModal.tsx`

**Implementation Steps:**
1. Replace `bg-[#0F1115]` → `bg-white`
2. Replace `border-white/10` → `border-blue-100`
3. Replace `text-white` within modal → `text-slate-700`
4. Replace keyboard shortcut badges `bg-white/10` → `bg-blue-50 border border-blue-200 text-slate-700`
5. Replace `text-gray-400` labels → `text-slate-500`
6. Ensure close button: `text-slate-400 hover:text-slate-600`

**Animation:** `scale(0.95) opacity-0` → `scale(1) opacity-1` (200ms ease-out)

---

### 🔴 T-03: Fix SSOConfig and TeamSettings dark gradient cards

> 👉 Research first: How do Notion, Linear, Vercel style upsell/upgrade cards?

**Problem:** `SSOConfig.tsx` uses `from-blue-900/20 to-indigo-900/20`. `TeamSettings.tsx` uses `from-purple-500/10 to-blue-500/10 border-purple-500/20`. Both wrong on a white-themed app.

**Files:** `/components/SSOConfig.tsx`, `/components/TeamSettings.tsx`

**Implementation Steps:**
1. `SSOConfig.tsx`: Replace dark gradient → `bg-blue-50 border border-blue-200 rounded-2xl`
2. Inside that card: replace white/dark text → `text-blue-900` for headings, `text-blue-700` for body
3. `TeamSettings.tsx`: Replace `from-purple-500/10 to-blue-500/10 border-purple-500/20` → `bg-blue-50 border border-blue-200`
4. Replace purple icon colors → `text-blue-600`
5. Keep CTA button as primary blue `btn-primary`

---

### 🔴 T-04: Implement Gemini Context Caching

> 👉 Research first: https://ai.google.dev/gemini-api/docs/caching

**Problem:** Every call sends the full system prompt (~1,500 tokens) paying full price. This is 40–60% of total per-call cost.

**Solution:** Cache system prompts as Gemini CachedContent. Cached tokens cost 90% less.

**Files:** `/supabase/functions/analyze-content/index.ts`

**Implementation Steps:**
1. Extract system prompt to constant `ANALYSIS_SYSTEM_PROMPT`
2. On cold start, call Gemini `cacheManager.create()` with `ttl: { seconds: 3600 }`
3. Store cache name in Deno KV
4. Pass `cachedContent: cacheName` in each GenerateContent call
5. Add fallback: if cache miss → recreate and continue
6. Log cache hit rate to Supabase analytics table

**Expected Savings:** 40–50% reduction on analysis call costs.

---

### 🔴 T-05: Per-page analysis with summaries + scores

> 👉 Research first: How does Semrush display per-page SEO scores? How does Screaming Frog show page-level data?

**Problem:** Users need to know which specific pages are weak and what to fix — not just a site-level score. Current page-level breakdown is sparse.

**Solution:** For each crawled page: 2-sentence summary, AEO/GEO/SEO score (0–100), top 3 improvements.

**Files:**
- `/supabase/functions/analyze-content/index.ts`
- `/components/dashboard/PagesTab.tsx`

**Implementation Steps:**
1. In `analyze-content`, add `ANALYZE_PAGES` action — single batched prompt sending all page contents at once
2. Gemini returns array: `[{ url, summary, aeo_score, geo_score, seo_score, top_improvements[] }]`
3. Store in Supabase `pages` table linked to `audit_id`
4. Update `PagesTab.tsx`:
   - Score chips: colored badge per page (red < 40, orange 40–70, green > 70)
   - 2-line summary under page URL
   - Expandable row: shows top 3 improvements
   - Sort by: Lowest AEO, Lowest GEO, Lowest SEO
   - Filter by: Score range, improvement type
5. Add "Fix All" button that triggers content rewrite suggestions for all low-score pages

**Animation:** Score chips count up from 0 when tab activates (1s total per chip). Expandable rows slide down 200ms ease-out.

**AI Enhancement:** Flag pages where content doesn't match the site's primary topic — label as "Off-Message" in orange.

---

### 🟠 T-06: Build Social Media Presence Analyzer

> 👉 Research first: Does any AEO/GEO tool analyze social media? (Research shows: none in top 10 do this)

**Problem:** Social media consistency directly affects how AI models perceive brand authority. No competitor analyzes this. It's a clear gap we can own.

**Solution:** Add social URLs to onboarding. Crawl public profiles. Score presence, consistency, and brand alignment.

**Files to Create:**
- `/services/socialService.ts`
- `/supabase/functions/analyze-social/index.ts`
- `/components/dashboard/SocialTab.tsx`

**Implementation Steps:**
1. Add social URL fields to `InputLayer.tsx` (Twitter/X, LinkedIn, YouTube, Instagram — all optional)
2. Create `analyze-social` Edge Function:
   - Deno fetch public profile pages (Twitter/X public, LinkedIn company page)
   - Extract: bio text, recent activity indicators, profile completeness
   - Gemini Flash: "Does this social profile consistently reinforce the brand message from their website?"
3. Return scores: Activity (0–100), Brand Consistency (0–100), Platform Presence (% of major platforms active)
4. Build `SocialTab.tsx`:
   - Platform presence grid (checkmarks per platform)
   - Consistency rating with specific mismatches highlighted
   - Example: "Your LinkedIn bio says 'productivity software' but website says 'team collaboration' — align these"
5. Include social score (weight 15%) in overall Visibility Score

**Market Impact:** First AEO/GEO platform to include social media in visibility scoring. Own this narrative.

---

### 🟠 T-07: Build Schema Markup Validator & AI Generator

> 👉 Research first: https://schema.org · Ahrefs 2026 data: 62% of AI citations come from pages with schema markup

**Problem:** Schema markup is the #1 factor for AI search citation. We don't currently validate or generate it — competitors don't either, but we can be first.

**Solution:** Crawl, validate, and auto-generate correct JSON-LD schema using Gemini.

**Files to Create:**
- `/services/schemaService.ts`
- Add `VALIDATE_SCHEMA` action to `/supabase/functions/analyze-content/index.ts`
- Add schema section to `/components/dashboard/OptimizationTab.tsx`

**Implementation Steps:**
1. In `crawl-site`, extract all `<script type="application/ld+json">` blocks per page
2. Add `VALIDATE_SCHEMA` action: Gemini Flash validates existing schema + generates missing ones
3. Gemini prompt: "Validate this schema. Generate complete JSON-LD for: Organization, Article, FAQPage, BreadcrumbList, WebSite — based on the page content provided."
4. Return: `{ existing_schema, issues[], missing_types[], generated_schema, copy_ready_json_ld }`
5. In `OptimizationTab.tsx`, add "Schema Health" section:
   - Per-page schema status (colored dots: green/yellow/red)
   - List of missing schema types with impact explanation
   - One-click copy of generated JSON-LD
   - "All pages are missing FAQPage schema — this could improve AI citation by 30%"

**Animation:** Generated code blocks appear with typewriter effect (3ms/char). Copy button flashes green on success.

---

### 🟠 T-08: Implement Batch Processing for Scheduled Audits

> 👉 Research first: https://ai.google.dev/gemini-api/docs/batch

**Problem:** Scheduled audits pay full Gemini prices. Batch API gives 50% discount for non-real-time workloads.

**Files:** `/supabase/functions/process-scheduled-audits/index.ts`, `/supabase/functions/analyze-content/index.ts`

**Implementation Steps:**
1. Add `isBatch: boolean` parameter to `analyze-content`
2. When `isBatch: true`, use Gemini Batch API endpoint instead of synchronous streaming
3. In `process-scheduled-audits`, always set `isBatch: true`
4. Store batch job ID in Supabase `batch_jobs` table, poll for completion every 5 minutes
5. On batch completion: store results + send notification (email + in-app toast on next login)
6. Show batch status in `HistoryPage.tsx` ("Scheduled audit processing... est. 2 hours")

**Expected Savings:** 50% on all scheduled audits. Agency plan: 1,000 audits/mo at $0.05 → $25/mo saved per Agency customer.

---

### 🟠 T-09: Build GEO/AEO Improvement Recommendation Engine

> 👉 Research first: What specific actions improve AI search citations? (Schema, E-E-A-T, FAQs, author bios, citations)

**Problem:** Users see a score but don't know what to do. Profound charges $500+/mo to tell users this. We should provide it at $49.

**Recommendation Format:**
```json
{
  "title": "Add FAQ Schema to Your Pricing Page",
  "why": "AI engines 3x more likely to cite pages with FAQ markup for comparison queries",
  "effort": "Low",
  "effort_minutes": 30,
  "impact": "High",
  "impact_points": "+12 AEO score",
  "steps": ["1. Copy the generated JSON-LD below", "2. Paste into <head>", "3. Test at schema.org/validator"],
  "copy_ready_asset": "{ \"@context\": \"https://schema.org\", ... }"
}
```

**Files:**
- Add `GENERATE_RECOMMENDATIONS` action to `analyze-content`
- Update `/components/dashboard/OptimizationTab.tsx`

**Implementation Steps:**
1. Gemini Flash prompt: "Based on page content, current AEO/GEO/SEO scores, and competitor data — generate 5 specific improvements ordered by effort×impact ratio"
2. Store in Supabase `recommendations` table linked to `audit_id`
3. Update `OptimizationTab.tsx`:
   - Impact vs. Effort matrix (2x2 grid visualization)
   - Each recommendation: title + why + effort badge + impact badge + expandable steps
   - "Mark as Done" checkbox — tracks completion
   - Progress bar: "3/8 recommendations completed (+18 points)"
4. "Quick Wins" section at top: show only Low Effort + High Impact items
5. Score projection: "If you complete all recommendations, your AEO score would be 84/100"

---

### 🟠 T-10: Fix Landing Page Dark Sections → White + Blue

> 👉 Research first: Study Vercel.com, Linear.app, Notion.so landing pages — all use white-dominant design in 2026

**Problem:** Feature cards use `border-white/10 bg-surface/45` — glass morphism intended for dark, wrong on white. Multiple sections break the clean white theme.

**Files:** `/components/LandingPage.tsx`

**Implementation Steps:**
1. FeatureCard: Replace `border-white/10 bg-surface/45` → `bg-white border border-blue-100 shadow-sm rounded-2xl`
2. FeatureCard icon wrapper: Replace `bg-white/5 border-white/10` → `bg-blue-50 border border-blue-100`
3. Section separator: Replace `via-white/10` → `via-blue-200`
4. Features section background: Set to `bg-[#F5F9FF]`
5. Pricing cards: Set PricingCard base → `bg-white border border-blue-100`, featured → `ring-1 ring-primary/40 bg-blue-50`
6. CTA/footer: Keep `bg-blue-900` (this single dark section is intentional and correct)
7. Testimonial cards: `bg-white border border-blue-100` with blue `"` quote marks
8. Logo bar: `bg-blue-50` strip
9. Navigation: `bg-white/95 border-b border-blue-100 backdrop-blur-sm`

**Animation:** Hero stat numbers count up on viewport entry (Intersection Observer, 1.2s ease-out).

---

### 🟡 T-11: Add Competitor Citation Tracking (Sentinel Fix)

> 👉 Research first: How do Profound and Peec AI display competitor citation data comparisons?

**Problem:** `SentinelDashboard.tsx` has purple gradients and is partially built. Users need side-by-side citation comparison vs. competitors for the same queries.

**Implementation Steps:**
1. Fix `SentinelDashboard.tsx` colors: `from-primary/10 to-purple-500/10` → `bg-blue-50 border-blue-200`
2. Connect competitor domains (from onboarding step 3)
3. Schedule daily Gemini grounding checks for top 20 tracking queries
4. Display: "For query X — You appeared 3/10 times, Competitor A appeared 7/10 times"
5. Trend chart: citation rate over 30/60/90 days (Recharts line chart, blue palette)
6. Alert system: "Competitor gained 3 new citations this week" (email + in-app)

---

### 🟡 T-12: Build SEO Landing Pages (Own Your Keywords)

> 👉 Research first: Keywords that drive signups for Profound, Peec AI, LLM Pulse

**Target Keywords:**
- "AI visibility tool" — 1.2k/mo, low competition
- "AEO checker" — 800/mo, medium competition
- "generative engine optimization tool" — 600/mo, low competition
- "how to rank in ChatGPT" — 2.1k/mo, medium competition
- "Profound alternative" — 300/mo, very low — steal their traffic
- "Peec AI alternative" — 200/mo, very low — steal their traffic
- "free AI visibility check" — high intent, drives signups

**Implementation Steps:**
1. Create `/pages/landing/` directory with individual pages per keyword cluster
2. Each page: 1,500+ words, answers "What is X? + How to improve X + Free tool CTA"
3. Apply schema markup: `SoftwareApplication`, `FAQPage`, `HowTo` on each page
4. Use Gemini Flash-Lite to draft initial content (~$0.002 per page)
5. Submit to Google Search Console for fast indexing
6. Free tool page: "Enter your URL → get instant AI visibility score" → requires email → drives signups

---

### 🟡 T-13: Redesign 4-Step Onboarding

> 👉 Research first: Best onboarding flows — Mixpanel, Hotjar, SE Ranking (under 2 minutes to value)

**Problem:** Current onboarding may not capture social handles, competitor domains, and primary goal — all required for a complete first analysis and personalized experience.

**4-Step Flow:**
1. "What's your website?" — URL + instant validation + favicon preview
2. "Add your social profiles" — Twitter/LinkedIn/YouTube (optional, skip available)
3. "Who are your top competitors?" — Domain autocomplete (optional, up to 3)
4. "What's your main goal?" — Cards: "Rank in ChatGPT / Google AI Overview / All AI Engines / Traditional SEO"

**Design:** White background, 4 blue progress dots, single centered card, large blue CTA, skip button on steps 2–3.

**Implementation Steps:**
1. Refactor `OnboardingPage.tsx` to multi-step wizard
2. Save state to Zustand `onboardingStore` (persist across refresh)
3. On step 4 completion → immediately trigger first audit, navigate to `AnalysisPage`
4. Show "Analyzing [domain]..." overlay with real-time progress during step 4

---

### 🟡 T-14: Supabase Result Caching (Cost Reduction)

> 👉 Research first: Supabase Postgres functions, content hashing patterns

**Problem:** Same domain audited 10x in 24h re-analyzes unchanged content, wasting $0.50 for $0.05 worth of new data.

**Solution:** Hash crawled content. If content unchanged within 24h → return cached Gemini results.

**Implementation Steps:**
1. Add `content_hash` (VARCHAR, MD5 of full page HTML) to `crawl_cache` table
2. In `crawl-site`, compute hash using `crypto.subtle.digest('MD5', content)`
3. In `analyze-content`: `SELECT * FROM crawl_cache WHERE domain = $1 AND content_hash = $2 AND created_at > NOW() - INTERVAL '24 hours'`
4. Cache hit: return stored scores, skip Gemini call
5. Cache miss: run Gemini, store results with hash
6. UI: Show "📄 Cached result — page content unchanged, last analyzed Xh ago" in Pages tab
7. Allow manual override: "Force re-analyze" button (costs 1 credit)

**Expected Savings:** 30–50% reduction for power users who audit frequently.

---

### 🟡 T-15: Score Explainer Drawer

> 👉 Research first: How does Google Lighthouse break down performance scores? (Gold standard UX for score explanations)

**Problem:** Users see 62/100 but don't understand: what does that mean? What moved it? What breaks it down?

**Solution:** Clickable score rings open a side drawer with full score breakdown + history.

**Implementation Steps:**
1. Add score breakdown to Gemini response: `{ score, factors: [{ name, weight, value, delta }] }`
2. Make score rings in `OverviewTab.tsx` clickable — open right drawer
3. Drawer content:
   - Score history sparkline (last 30 days, blue line on white)
   - Factor breakdown: "Schema markup: 40/40 ✅ · Citation signals: 18/30 ⚠️ · E-E-A-T: 12/30 🔴"
   - Delta vs. last audit: "+8 points from schema fix"
   - Top 2 quick wins
4. Drawer: enters from right, 350ms ease-out, white background, blue header

---

### 🟢 T-16: White-Label Report System

> 👉 Research first: What do SE Ranking and Ahrefs white-label features look like?

**Problem:** `ReportBranding.tsx` exists but is incomplete. Agency clients need reports with their own logo and colors, not "Cognition AI" branding.

**Implementation Steps:**
1. Review and complete `ReportBranding.tsx` component
2. Add logo upload → Supabase Storage (`/brand/{org_id}/logo.png`)
3. Add primary color picker with live preview
4. Apply branding to PDF export: custom header, footer, colors
5. Gate behind Agency plan check
6. Add "Preview Report" before export

---

### 🟢 T-17: Developer API (Self-Serve)

> 👉 Research first: Semrush API docs, how developers want to consume AEO/SEO data

**Problem:** `api-v1` and `manage-api-keys` Edge Functions exist but aren't exposed in the UI. API access accelerates enterprise adoption.

**Implementation Steps:**
1. Complete `APIKeyManager.tsx` UI (currently exists, review state)
2. Add "Developer" section to `SettingsPage.tsx`
3. API key management: create, name, last-used timestamp, copy, revoke
4. Rate limits by plan: Starter 100/day · Pro 1k/day · Agency 5k/day
5. Build `/pages/docs/api.tsx` with live code examples (cURL, JavaScript, Python)
6. Expose: `POST /api/v1/audit` · `GET /api/v1/audit/:id` · `GET /api/v1/report/:id`

---

## 📱 SECTION 11 — MOBILE RESPONSIVENESS

> 👉 Test on: iPhone 14 Pro (390px), iPad (768px), Samsung Galaxy (412px)

| Issue | Component | Fix |
|-------|-----------|-----|
| Sidebar overlaps content | Sidebar.tsx | Overlay drawer on mobile, `z-50` |
| Score rings too small | OverviewTab | 80px mobile / 120px desktop |
| Tables overflow | PagesTab, BenchmarkTab | Horizontal scroll + sticky first column |
| Body font too small | Multiple | Min 14px body, 16px on inputs |
| Tap targets too small | Buttons, links | Min 48px height on all tappable elements |
| Onboarding inputs | OnboardingPage | Full-width, `text-base` (prevents iOS zoom) |

---

## 🔒 SECTION 12 — PERFORMANCE TARGETS

| Metric | Target | Fix |
|--------|--------|-----|
| LCP (Landing) | < 1.5s | Optimize HeroGlobe, preload fonts |
| FCP (Dashboard) | < 0.8s | Verify all 8 tabs are lazy-loaded |
| JS Bundle | < 300KB gzip | Audit imports, remove unused libraries |
| Analysis response | < 8s (5 pages) | Stream results, show partial data as it arrives |
| Supabase queries | < 100ms | Add indexes on domain, user_id, created_at |

---

## 📣 SECTION 13 — MARKETING STRATEGY

### Channel Priority (by ROI)
| Channel | Tactic | CAC | Priority |
|---------|--------|-----|----------|
| SEO + Content | Keyword pages + free tool | $0 organic | 🔴 First |
| Product Hunt | Launch when complete | $0 | 🟠 |
| Reddit / Hacker News | "Free AI Visibility Check" | $0 | 🟠 |
| Twitter / LinkedIn | Founder-led content | $0 | 🟠 |
| Cold Email | Target SEO agency owners | $30–80 | 🟡 |
| Paid Search | "Profound alternative" keywords | $50–120 | 🟡 |
| Integrations | WordPress, Webflow, HubSpot | $0 | 🟢 |

### 90-Day Content Calendar
- **Week 1–2:** "What is AEO? The Complete 2026 Guide" + "10 Ways to Rank in ChatGPT"
- **Week 3–4:** "Cognition vs Profound: $49 vs $499 — What's the Difference?"
- **Week 5–6:** Free AI Visibility Checker launch (lead gen page)
- **Week 7–8:** "How We Built the Cheapest AEO Platform Without Sacrificing Accuracy"
- **Week 9–12:** Customer case studies + testimonials + social proof

### Social Media Playbook
- **Twitter/X:** Daily "AEO Tip #X" thread — specific, actionable, shareable
- **LinkedIn:** Weekly long-form: "The Death of Traditional SEO — What Replaces It"
- **YouTube:** 10-min screen recordings: "We analyzed [Famous Brand]'s AI Visibility"

---

## 📄 SECTION 14 — FILE ORGANIZATION

### Clean Folder Structure
```
/
├── pages/
│   ├── landing/             ← SEO keyword landing pages (NEW)
│   ├── auth/                ← Login, signup, forgot password
│   ├── legal/               ← Privacy, terms
│   └── docs/                ← API documentation (NEW)
├── components/
│   ├── dashboard/           ← Dashboard tab components
│   ├── ui/                  ← Design system: Button, Card, Input, Badge
│   ├── branding/            ← Logo, brand assets
│   ├── hero/                ← Landing page hero components
│   ├── reports/             ← PDF/export components
│   └── modals/              ← Consolidated modal components (NEW)
├── services/
│   ├── geminiService.ts
│   ├── crawlService.ts
│   ├── socialService.ts     ← NEW
│   ├── schemaService.ts     ← NEW
│   ├── competitorService.ts
│   └── supabase.ts
├── stores/                  ← Zustand stores
├── hooks/                   ← Custom React hooks
├── utils/                   ← Pure utility functions
├── types.ts                 ← Global TypeScript types
└── supabase/
    ├── functions/
    │   ├── _shared/         ← Shared: cors, retry, cache, analytics
    │   ├── analyze-content/ ← Core AI engine
    │   ├── crawl-site/      ← Web crawler
    │   ├── analyze-social/  ← Social media analyzer (NEW)
    │   └── ...
    └── migrations/          ← DB schema migrations
```

---

## ✅ SECTION 15 — RELEASE VERIFICATION CHECKLIST

Run these checks before every release:

### API Cost Safety
- [ ] `grep -r "gemini-2.0" ./supabase ./services` returns 0 results
- [ ] `grep -r "claude-\|openai\|gpt-4" ./supabase ./services` returns 0 results
- [ ] Context caching enabled and verified in Edge Function logs
- [ ] Supabase crawl_cache content_hash column exists in schema

### UI/UX Quality
- [ ] `grep -r "bg-\[#0F\|bg-\[#0f\|border-white/10" ./components` returns 0 in wrong contexts
- [ ] No purple gradients outside intentional brand use
- [ ] All modals use `bg-white border-blue-100`
- [ ] Score rings animate on mount (verify in browser)
- [ ] Mobile layout verified at 390px viewport in Chrome DevTools

### Feature Completeness
- [ ] Per-page summaries generated for every crawled page
- [ ] Schema validation runs on every audit
- [ ] Social tab renders if social URLs provided in onboarding
- [ ] 4-step onboarding captures: URL + social + competitors + goal
- [ ] Scheduled audits use batch Gemini API

### Performance
- [ ] Lighthouse: LCP < 1.5s on landing page
- [ ] Lighthouse: Performance score > 90
- [ ] All 8 dashboard tabs lazy-loaded (verify in Network tab — no upfront chunk)
- [ ] Analysis streams: first visible result < 4s

### Marketing
- [ ] `/pages/landing/aeo-checker` page live and indexed
- [ ] `/pages/landing/profound-alternative` page live
- [ ] Free audit tool captures email before showing full results
- [ ] Google Search Console shows no crawl errors

---

*Every task must begin with internet research before implementation. Every decision must be backed by competitor data, user behavior, or market evidence. The goal: build the product that makes users say "Why doesn't anything else work this well?"*
