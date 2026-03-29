# COGNITION AI — MASTER TASK LIST
## Goal: Best AEO/GEO/SEO platform globally at the lowest API cost
**Last Updated:** March 2026 | **Status:** Active Development

---

## 🔴 PRIORITY LEGEND
- 🔴 **CRITICAL** — Do this week. Core product/cost issue.
- 🟠 **HIGH** — Do next 2 weeks. Major competitive gap.
- 🟡 **MEDIUM** — Do next month. Meaningful improvement.
- 🟢 **LOW** — Roadmap. Nice to have.

---

## SECTION A — API COST OPTIMIZATION 💰
*Goal: Reduce per-audit cost to under $0.05 (from current ~$0.20–0.40)*
*Research first: https://ai.google.dev/gemini-api/docs/pricing*

---

### A-1. 🔴 Switch ALL non-critical calls to Gemini 2.0 Flash
**Status:** [ ] Not started

**Problem:**
- Current code uses `gemini-2.0-flash-exp` for crawling (good) but `gemini-2.0-flash-exp` for analysis too
- The multi-provider fallback (Claude → OpenAI) is expensive if triggered
- Claude 3.5 Sonnet costs ~40x more than Gemini Flash per token

**Gemini Pricing (March 2026):**
```
gemini-2.0-flash-exp:   $0.075/1M input  | $0.30/1M output   ← USE THIS
gemini-1.5-flash:       $0.075/1M input  | $0.30/1M output   ← Same cost
gemini-1.5-pro:         $1.25/1M input   | $5.00/1M output   ← 16x more expensive
gemini-2.0-flash-lite:  $0.0375/1M input | $0.15/1M output   ← CHEAPEST (use for summaries)
```

**Research:** https://ai.google.dev/gemini-api/docs/pricing

**Action Steps:**
- [ ] Replace `GEMINI_CHAT_MODEL` env var default with `gemini-2.0-flash-lite` for page summaries
- [ ] Keep `gemini-2.0-flash-exp` for analysis scoring (needs accuracy)
- [ ] Disable Claude/OpenAI fallback entirely (set providerPreference to `['gemini']` only)
- [ ] File: `/supabase/functions/analyze-content/index.ts` — line 276, change providerPreference array

**Expected Savings:** 60–80% reduction on fallback calls

---

### A-2. 🔴 Implement Gemini Context Caching
**Status:** [ ] Not started

**Problem:**
- Every audit re-sends the same system prompt (~2,000 tokens) every call
- Repeat analysis of same domain re-processes same content

**How Context Caching Works:**
- Cache your system prompt + static content → only pay 25% of normal input token cost
- Cache duration: 1 hour minimum, up to 1 month
- Research: https://ai.google.dev/gemini-api/docs/caching

**Action Steps:**
- [ ] Create a cached system context for the analysis prompt in `analyze-content`
- [ ] Store cache key in Supabase, reuse for same domain within 24 hours
- [ ] Cache the brand/domain context after first crawl → reuse on re-audits
- [ ] Expected implementation: `CachedContent` API in `@google/generative-ai`

**Expected Savings:** 40–60% on input token costs for repeat audits

---

### A-3. 🔴 Smart Token Budgeting Per Action
**Status:** [ ] Not started

**Problem:**
- All Gemini calls use same `maxOutputTokens: 8000` even when 500 tokens suffice
- Discovery response needs 500 tokens max, not 8,000

**Action Steps:**
- [ ] Audit every `generateContent` call and set appropriate `maxOutputTokens`:
  ```
  Page Summary:           maxOutputTokens: 400   (was 8000) → 95% savings
  Discovery (links):      maxOutputTokens: 500   (was 2000) → 75% savings
  AEO Score + Reasoning:  maxOutputTokens: 2000  (was 8000) → 75% savings
  Recommendations:        maxOutputTokens: 3000  (was 8000) → 62% savings
  Rewrite Sandbox:        maxOutputTokens: 4000  (keep)
  Schema Generation:      maxOutputTokens: 2000  (was 8000)
  ```
- [ ] File: `/supabase/functions/analyze-content/index.ts` — all `maxOutputTokens` settings
- [ ] File: `/supabase/functions/crawl-site/index.ts` — discovery + scrape calls

**Expected Savings:** 50–70% on output token costs

---

### A-4. 🔴 Replace Perplexity API with Gemini Grounding
**Status:** [ ] Not started

**Problem:**
- Perplexity API used for live verification checks costs $0.005–0.020 per call
- Gemini has built-in Google Search grounding at $35/1000 grounding requests = $0.035/check

**Research:**
- Perplexity pricing: https://docs.perplexity.ai/docs/pricing ($0.005 per request)
- Gemini grounding: https://ai.google.dev/gemini-api/docs/grounding

**Action Steps:**
- [ ] Evaluate if Perplexity is still used in codebase: `grep -r "perplexity" /supabase/functions/`
- [ ] Replace with Gemini's `tools: [{ googleSearch: {} }]` for live web verification
- [ ] Grounding with Google Search = same live data, lower cost, one less API key

**Expected Savings:** Eliminate separate Perplexity API cost entirely

---

### A-5. 🟠 Implement Batch Processing for Multi-Page Audits
**Status:** [ ] Not started

**Problem:**
- Currently each page is analyzed one-by-one (sequential API calls)
- Pages could be batched: send 3–5 pages in one Gemini call = fewer API requests

**Research:** https://ai.google.dev/gemini-api/docs/batch

**Action Steps:**
- [ ] Create `ANALYZE_BATCH` action that processes up to 5 pages per Gemini call
- [ ] Combine page content with clear separators: `--- PAGE 1: [url] ---`
- [ ] Gemini returns JSON array with analysis for each page in one response
- [ ] Update `AnalysisPage.tsx` to use batch endpoint
- [ ] File: `/supabase/functions/analyze-content/index.ts` — add `ANALYZE_BATCH` case

**Expected Savings:** 30–50% reduction in total API calls, significant latency improvement

---

### A-6. 🟠 Free Crawling Without Gemini (Use Native Deno Fetch First)
**Status:** [ ] Partially done (crawl-site updated)

**Problem:**
- Gemini is used to extract markdown from HTML (costs tokens)
- Simple pages can be text-extracted with pure regex (zero cost)

**Action Steps:**
- [ ] Add a "fast path" in `crawl-site`: if page HTML is simple (< 50KB, no JS-heavy), skip Gemini and use regex extraction
- [ ] Only invoke Gemini for complex/JS-heavy pages or when fast-path quality is poor
- [ ] Heuristic: If extracted text > 300 words and readable → skip Gemini call
- [ ] Expected: 40–60% of pages can use the free path

**Expected Savings:** $0.002 × 40–60% of pages = significant for large audits

---

### A-7. 🟠 Supabase Result Caching (Don't Re-Analyze Same Page)
**Status:** [ ] Not started

**Problem:**
- Same URL analyzed multiple times by different users wastes API cost
- Cached results can be shared across accounts (for public pages)

**Action Steps:**
- [ ] Create `page_analysis_cache` Supabase table: `(url_hash, analysis_json, created_at, expires_at)`
- [ ] Before every Gemini call, check cache: `SELECT * FROM page_analysis_cache WHERE url_hash = hash(url) AND expires_at > NOW()`
- [ ] Cache TTL: 24 hours for normal pages, 7 days for stable pages (docs, about pages)
- [ ] Cache invalidation: user can force-refresh with "Re-analyze" button
- [ ] Migration file: `/supabase/migrations/[timestamp]_add_page_cache.sql`

**Expected Savings:** 20–40% reduction in total API calls (varies by user overlap)

---

### A-8. 🟡 Implement Gemini Structured Output (Reduce Parsing Failures)
**Status:** [ ] Not started

**Problem:**
- When JSON parsing fails, the system retries (double API cost)
- Retry rate unknown but likely 5–15% of calls

**Research:** https://ai.google.dev/gemini-api/docs/structured-output

**Action Steps:**
- [ ] Use `responseMimeType: "application/json"` + `responseSchema` in all analysis calls
- [ ] This forces Gemini to always return valid JSON (zero parsing failures)
- [ ] Define Zod/TypeScript schemas for every output type
- [ ] File: `/supabase/functions/analyze-content/index.ts` — add `generationConfig` to all model calls

**Expected Savings:** Eliminate retry costs (5–15% cost reduction)

---

## SECTION B — FEATURE GAPS (BEAT COMPETITORS) 🚀
*What no competitor in the $49–399 range currently offers*

---

### B-1. 🔴 Page-by-Page Content Summary
**Status:** [ ] Not started

**Problem:**
- Users need to understand what Gemini/ChatGPT "thinks" each page is about
- Zero competitors show this clearly at the page level (except Profound at $399+)
- Currently we analyze pages but don't surface the AI's "understanding" of each page

**Research competitors:** Profound.ai, Surfer SEO page audit, Frase content brief

**What to build:**
- For every crawled page, generate a 2–3 sentence "AI perception summary":
  *"Gemini understands this page as: a pricing comparison tool for mid-size marketing teams. Key entities recognized: Cognition AI, competitor tools, monthly pricing. Missing: specific use case examples, customer testimonials."*
- Show this in the Pages tab as expandable cards
- Color-code: 🟢 Well understood | 🟡 Partial | 🔴 Misunderstood

**Action Steps:**
- [ ] Add `PAGE_SUMMARY` sub-action inside `ANALYZE` that generates 2–3 sentence AI perception
- [ ] Use `gemini-2.0-flash-lite` model (cheapest) with `maxOutputTokens: 300`
- [ ] Cost per page summary: ~$0.001 (virtually free)
- [ ] Add to `PageAnalysis` type in `types.ts`: `aiPerception: string`
- [ ] Update `PagesTab.tsx` to show AI perception for each page
- [ ] Show "What AI engines think this page is about" prominently

**Competitor gap:** Frase shows content score, not AI perception. Profound shows citations, not understanding. We show the actual AI "mind" reading.

---

### B-2. 🔴 Social Media Presence Analysis
**Status:** [ ] Not started

**Research competitors:** Zero competitors combine social media + GEO/AEO analysis in one tool.

**What to build:**
- Check if the brand appears in AI answers about their social profiles
- Score: LinkedIn presence, Twitter/X presence, YouTube presence for AI visibility
- "Is your LinkedIn being cited when someone asks AI about [brand]?"

**Free/low-cost data sources:**
- LinkedIn company page: public scrape via Deno fetch (free)
- Twitter/X profile: public page scrape (free, no API needed for basic info)
- YouTube channel: YouTube Data API v3 — FREE (10,000 units/day free quota)
- Social mention detection: Query Gemini with `[brand] social media` prompts

**Action Steps:**
- [ ] Add `SOCIAL_ANALYSIS` action to `analyze-content` Edge Function
- [ ] Input: `{ brandName, linkedinUrl?, twitterHandle?, youtubeChannel?, websiteUrl }`
- [ ] Gemini prompt: "Search for social media presence signals for [brand]. What social channels are referenced in AI-generated answers? What content from their social media appears in AI training data?"
- [ ] Use Gemini Google Search grounding for live social mention detection
- [ ] Score each platform: 0–100 social visibility score
- [ ] Add `SocialTab.tsx` to dashboard (between Overview and Pages)
- [ ] Show: Platform scores, top cited posts/content, improvement recommendations

**Cost:** ~$0.01–0.02 per social analysis (Gemini Flash + search grounding)
**Competitor advantage:** No tool does this. It's completely unique.

---

### B-3. 🔴 Website Technical Audit (Free APIs)
**Status:** [ ] Partially done (schema recommendations exist)

**Problem:**
- Missing: core web vitals, accessibility score, schema validation, robots.txt check
- These are huge AEO signals that we don't currently surface

**Free tools to integrate:**
```
Schema Validation:    https://validator.schema.org/ (free)
PageSpeed Insights:   https://developers.google.com/speed/docs/insights/v5/get-started (free, 25K calls/day)
W3C HTML Validator:   https://validator.w3.org/docs/api.html (free)
SSL Check:            Built-in via fetch() response headers (free)
Robots.txt parse:     Deno fetch (free)
Meta tags check:      Deno fetch + regex (free)
Sitemap validation:   Deno fetch + XML parse (free)
```

**Action Steps:**
- [ ] Create `TECHNICAL_AUDIT` action:
  - Fetch + parse robots.txt: check if AI bots are blocked (Googlebot-AI, GPTBot, ClaudeBot, PerplexityBot)
  - Call PageSpeed Insights API: get performance score
  - Call schema.org validator: validate JSON-LD markup
  - Check SSL cert: HTTPS enforced?
  - Check canonical tags: present on all pages?
  - Check Open Graph tags: og:title, og:description, og:image present?
  - Check hreflang: international targeting
- [ ] AI bot blocking check is CRITICAL: if robots.txt blocks GPTBot → AEO score = 0
- [ ] Show Technical Audit as a checklist in Overview tab
- [ ] Add `TechnicalScore` to `Report` type in `types.ts`
- [ ] Cost: Nearly $0 (all free APIs + minimal Gemini for interpretation)

**Research:**
- AI bot user agents: https://platform.openai.com/docs/gptbot
- Google Extended: https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers
- ClaudeBot: https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-the-web-and-how-can-site-owners-block-the-crawler

---

### B-4. 🟠 GEO Ranking Improvement Roadmap
**Status:** [ ] Not started

**Problem:**
- We give a GEO score but don't give a ranked step-by-step improvement plan
- Competitors like Relixir ($3,600/mo) give automated improvement, we don't

**What to build:**
- After analysis, generate a prioritized "GEO Improvement Roadmap" with:
  - 90-day plan: what to do each week to improve GEO score
  - Specific content additions needed
  - Which pages to update first (sorted by citation potential)
  - Expected score improvement per action (e.g., "+8 points if you add FAQ schema to /pricing")

**Action Steps:**
- [ ] Add `GEO_ROADMAP` action using Gemini Flash + analysis results as context
- [ ] Output: JSON with `{ week: number, action: string, expected_impact: number, page_url: string }[]`
- [ ] Show as a timeline/Gantt-style view in the Optimize tab
- [ ] Allow user to mark tasks as done → recalculate score estimate
- [ ] Cost: ~$0.005 per roadmap generation (context is already cached from analysis)

**Competitor advantage:**
- Profound: gives analytics, no roadmap
- Relixir: gives roadmap + auto-execution at $3,600/mo
- Cognition: gives roadmap at $49/mo → 99% cheaper

---

### B-5. 🟠 SEO Basics (Free Data Sources)
**Status:** [ ] Not started

**Problem:**
- We have no traditional SEO metrics (DA, backlinks, keywords)
- Users expect these alongside GEO/AEO scores

**Free APIs to use:**
```
Domain Authority (approx):  Moz Free API (limited but free tier exists)
                            Research: https://moz.com/products/api/pricing
Backlink count:             Ahrefs has no free API; use web archive.org
Keyword ranking:            Google Search Console API (OAuth, already integrated!)
Organic traffic estimate:   Similarweb has no free API; skip
Core Web Vitals:            Google PageSpeed API (FREE, 25K/day)
```

**Action Steps:**
- [ ] Add `SEO_BASICS` action:
  - Use Google Search Console data (already connected for some users) → pull top keywords
  - Use PageSpeed API for Core Web Vitals
  - Use Gemini to analyze on-page SEO signals from crawled content
  - Calculate keyword density, heading structure, meta description quality
- [ ] Show SEO score as a new tab or part of Overview
- [ ] For users without GSC: offer a "Connect Google Search Console" prompt
- [ ] Cost: $0 for GSC + PageSpeed, ~$0.002 Gemini for on-page analysis

---

### B-6. 🟠 Competitor Gap Analysis (What Competitors Are Doing That You're Not)
**Status:** [ ] Partial (BenchmarkTab exists)

**Problem:**
- BenchmarkTab shows scores but doesn't explain WHY competitor scores are higher
- Users need to know exactly what content/entities competitors have that they don't

**What to build:**
- Analyze competitor sites (up to 5) at the same depth as the user's site
- Generate side-by-side: "Competitor has this, you don't":
  - Entity coverage gaps: "Amazon has [Schema: Product, Review, FAQPage] — you have [Schema: Organization only]"
  - Content depth gaps: "Your /pricing page has 300 words, competitor has 1,200 words with 4 FAQs"
  - Social signal gaps: "Competitor has 50K LinkedIn followers — you have 2K"
  - Citation gap: "Competitor cited in 8 of 10 AI platforms — you cited in 3"

**Action Steps:**
- [ ] Crawl competitor URLs using same crawl-site Edge Function (already built)
- [ ] Add `COMPETITOR_GAP` action that compares analysis JSONs side-by-side
- [ ] Generate specific action items: "To match [competitor], add these 5 FAQ items to /pricing"
- [ ] Use Gemini Flash for comparison (cheap — comparing two JSON objects)
- [ ] Cost: ~$0.05 extra per competitor analyzed (crawl + compare)

---

### B-7. 🟠 AEO Score — Answer Engine Specific (Featured Snippets, Voice, AI Overviews)
**Status:** [ ] Partial (visibility scoring exists)

**Problem:**
- AEO specifically means: optimizing for featured snippets, Google AI Overviews, voice search answers
- Currently we score "visibility" but not specific AEO signals

**What to check:**
- Featured snippet potential: Does page have a clear, direct answer in first 100 words?
- FAQ schema: Present and valid?
- HowTo schema: For process pages?
- Short answer format: 40–60 word summary at top of page?
- Voice search optimization: Conversational language? Question+Answer format?
- Google AI Overview factors: E-E-A-T signals, author info, source citations

**Research:** https://developers.google.com/search/docs/appearance/featured-snippets

**Action Steps:**
- [ ] Expand `CHECK_VISIBILITY` action to include AEO-specific signals
- [ ] Add AEO checklist to Overview tab: 10 checks, each Pass/Fail with fix
- [ ] Use Gemini to score each signal: "Does this page have a clear 40-60 word featured snippet answer?"
- [ ] Add `aeoScore` and `aeoChecklist` to `Report` type in `types.ts`

---

### B-8. 🟡 AI Bot Crawl Permission Checker (Unique Feature)
**Status:** [ ] Not started

**Why this matters:**
- If robots.txt blocks GPTBot, Claude, or Perplexity crawlers → AI engines can't learn from your site
- This is the #1 hidden reason brands are invisible to AI
- ZERO competitors surface this clearly

**AI Bot User Agents to check:**
```
GPTBot             → OpenAI (ChatGPT)
Google-Extended    → Google (Gemini, AI Overviews)
ClaudeBot          → Anthropic (Claude)
PerplexityBot      → Perplexity
YouBot             → You.com
anthropic-ai       → Anthropic
CCBot              → Common Crawl (used by many LLMs)
Meta-ExternalAgent → Meta AI
```

**Action Steps:**
- [ ] In `TECHNICAL_AUDIT`: fetch `/robots.txt`, parse and check each AI bot user agent
- [ ] Show a clear "AI Crawl Access Report": Which AI engines can/cannot crawl your site
- [ ] If any AI bot is blocked → show RED alert: "ChatGPT cannot access your site!"
- [ ] Provide corrected robots.txt snippet to allow AI crawlers
- [ ] Cost: $0 (pure Deno fetch, no AI needed for this check)

---

### B-9. 🟡 Schema.org Auto-Generator with Copy+Download
**Status:** [ ] Partial (recommendations include schema hints)

**Problem:**
- Recommendations say "add FAQ schema" but don't give the exact code
- Users want copy-paste-ready JSON-LD

**Action Steps:**
- [ ] Add `GENERATE_SCHEMA` action using Gemini Flash Lite (cheapest model)
- [ ] For each page type, auto-generate complete valid JSON-LD:
  - Homepage: `Organization` + `WebSite` + `SiteLinksSearchBox`
  - Blog post: `Article` + `BreadcrumbList`
  - Product page: `Product` + `Review` + `AggregateRating`
  - FAQ page: `FAQPage` with each Q&A
  - Pricing page: `Product` + `Offer`
  - About page: `Organization` + `Person` (founders)
- [ ] Show generated schema in syntax-highlighted code block
- [ ] One-click copy, one-click download as `.json`
- [ ] "Validate" button → sends to schema.org validator (free)
- [ ] Cost: ~$0.002 per schema generation (Gemini Flash Lite, low output tokens)

---

### B-10. 🟡 Content Freshness Monitoring
**Status:** [ ] Partial (Sentinel exists but no freshness scoring)

**Research:** https://www.conductor.com/academy/content-freshness/

**What to build:**
- For each page: when was it last significantly updated?
- For AI engines: content older than 90 days starts losing citation preference
- Alert: "Your /blog/ai-seo-guide was last updated 180 days ago. Update it to stay in AI recommendations."

**Action Steps:**
- [ ] Add `last_modified_at` parsing from HTTP headers + meta tags in crawl-site
- [ ] In Sentinel: calculate days since last update per page
- [ ] Freshness score: 100 (updated this week) → 0 (not updated in 1 year)
- [ ] Weekly email alert: "These 3 pages need updating to maintain AI visibility"
- [ ] Cost: $0 extra (HTTP headers are free, no additional Gemini calls)

---

## SECTION C — TOP 10 COMPETITOR BEATDOWN PLAN 🥊
*For each competitor: what they offer, what we do better, cost advantage*

---

### C-1. vs. PROFOUND.AI ($399+/month)
**Their strengths:** 10+ AI engines, 1B+ citations/day, enterprise trust
**Their weakness:** Analytics-only (no recommendations, no fixes), $399 minimum

**How we beat them:**
- [ ] Match: Track 10+ AI engines (currently 8 → add Grok, DeepSeek, Meta AI, Copilot)
- [ ] Beat: Full recommendation + fix engine (they only show data)
- [ ] Beat: Price ($49 vs $399 — 8x cheaper)
- [ ] Beat: Social media integration (they don't have)
- [ ] Beat: Schema auto-generator (they don't have)

**Tasks:**
- [ ] Add Grok visibility check to `CHECK_VISIBILITY_BATCH`
- [ ] Add DeepSeek visibility check
- [ ] Add Meta AI visibility check
- [ ] Add Microsoft Copilot visibility check
- [ ] Total engines tracked: 10+ (currently: ChatGPT, Gemini, Claude, Perplexity, Google AI Overviews, Copilot, Meta AI, Grok)

---

### C-2. vs. SURFER SEO ($99–219/month)
**Their strengths:** Integrated content editor, real-time scoring, large user base
**Their weakness:** No GEO tracking natively (add-on $95/mo), keyword-focused

**How we beat them:**
- [ ] Beat: GEO-native (they bolt it on, we're built around it)
- [ ] Beat: AI perception summary per page (unique)
- [ ] Beat: Social media analysis (they don't have)
- [ ] Match: Content optimization recommendations
- [ ] Add: Real-time content scoring (show live score as user edits — future feature)

---

### C-3. vs. CLEARSCOPE ($189–399/month)
**Their strengths:** Simple letter grade (A–F), WordPress plugin, brand recognition
**Their weakness:** No API, no GEO/AEO, no competitor analysis, recent price hikes

**How we beat them:**
- [ ] Beat: API access on all plans (they have NO API)
- [ ] Beat: GEO + AEO + SEO (they do SEO only)
- [ ] Beat: Competitor analysis (they don't have)
- [ ] Match: Simple scoring (add A–F letter grade alongside 0–100 score)
- [ ] Add: Simple A–F letter grade to Overview tab for non-technical users

**Task:**
- [ ] Add `letterGrade` computed from score to `Report` type: `A (90-100), B (75-89), C (60-74), D (40-59), F (<40)`
- [ ] Show letter grade prominently on Overview tab

---

### C-4. vs. FRASE.IO ($39–239/month)
**Their strengths:** Most affordable entry, API on all plans, 50+ endpoints, 8 AI platforms tracked
**Their weakness:** No deep GEO analysis, no vector analysis, no social media

**How we beat them:**
- [ ] Beat: Vector semantic analysis (completely unique)
- [ ] Beat: Social media presence analysis
- [ ] Beat: Page-by-page AI perception summary
- [ ] Beat: Schema auto-generator
- [ ] Match: API access (we need public API on all plans too)

**Task:**
- [ ] Open public API endpoints (currently limited to internal use)
- [ ] Document API at `/docs` → already have APIDocs.tsx
- [ ] API key management → already have APIKeyManager.tsx

---

### C-5. vs. SEMRUSH ($139.95+/month)
**Their strengths:** 130M prompt database, massive brand recognition, integrated SEO
**Their weakness:** GEO is an add-on, not native; being acquired by Adobe (uncertainty); complex UI

**How we beat them:**
- [ ] Beat: Purpose-built for AI visibility (they're SEO-first)
- [ ] Beat: Simpler UX (they have 50+ tools, we have one focus)
- [ ] Beat: Price for GEO ($49 vs $249+ for their AI features)
- [ ] Match: Prompt database — build our own using Gemini (Task D-1 below)

---

### C-6. vs. ATHENAHQ ($295+/month)
**Their strengths:** Simulation capability (test prompts before optimizing), credit-based pricing
**Their weakness:** Requires technical customization, not marketer-friendly UI

**How we beat them:**
- [ ] Beat: Marketer-friendly UI (white + blue, simple, clean)
- [ ] Match: Simulation (we have Rewrite Sandbox already)
- [ ] Beat: Price ($49 vs $295)
- [ ] Beat: Pre-built analysis (they require custom setup, we're instant)

---

### C-7. vs. RELIXIR ($3,600–5,200/month)
**Their strengths:** Automation (no developer needed), delivers ranking in <30 days
**Their weakness:** Black box, insanely expensive, no transparency

**How we beat them:**
- [ ] Beat: Price (99% cheaper)
- [ ] Beat: Transparency (show every step, every score, every reason)
- [ ] Match: Automation — build GEO Improvement Roadmap (Task B-4)
- [ ] Future: Auto-push schema fixes to WordPress/Webflow CMS

---

### C-8. vs. OPENLENS (FREE)
**Their strengths:** Free, no friction, 5 AI engines tracked, competitive benchmarking
**Their weakness:** Monitoring only (no optimization, no recommendations, no fixes)

**How we beat them:**
- [ ] Beat: Full optimization layer (they show the problem, we solve it)
- [ ] Beat: Social media analysis
- [ ] Beat: Schema generation
- [ ] Beat: Technical audit
- [ ] Strategy: Offer 1 free audit on landing page to compete at the top of funnel
- [ ] Task: Add free trial / lead audit without account creation on landing page

---

### C-9. vs. BRIGHTEDGE ($2,690+/month)
**Their strengths:** Revenue attribution (ties AI visibility to conversions), enterprise trust
**Their weakness:** Enterprise-only, impossible for SMB to afford

**How we beat them:**
- [ ] Beat: Price (99% cheaper)
- [ ] Match: Revenue attribution — build AI Traffic Attribution Dashboard (Task B from implementation.md)
- [ ] Match: Real-time monitoring (Sentinel)
- [ ] Beat: Easier to use, no enterprise sales process

---

### C-10. vs. PEEC AI ($99–530/month)
**Their strengths:** Unlimited team seats, transparent pricing, solid mid-market option
**Their weakness:** Basic reporting, no content generation, Claude/Gemini tracking is add-on

**How we beat them:**
- [ ] Beat: Full recommendation + fix engine (they only show scores)
- [ ] Beat: Social media analysis
- [ ] Beat: Schema generation
- [ ] Match: Transparent pricing ✅ (already done)
- [ ] Match: Unlimited seats — consider adding to Agency plan

---

## SECTION D — INTELLIGENCE DATABASE FEATURES 🧠
*Build our own data moat so competitors can't replicate*

---

### D-1. 🟠 Build AI Prompt Intelligence Database
**Status:** [ ] Not started

**Why:** Semrush has 130M prompts — this is their competitive moat. We need ours.

**How to build it cheaply:**
- Use Gemini to generate 100 industry-specific prompts per niche (cost: ~$0.01/100 prompts)
- Store in Supabase: `industry_prompts` table
- For each new user: generate industry-specific prompts using their domain category
- Over time: crowdsource which prompts drive actual AI citations

**Action Steps:**
- [ ] Create `industry_prompts` Supabase table: `(id, industry, prompt_text, created_at, citation_count)`
- [ ] On new audit: generate 20 industry-specific prompts for user's domain
- [ ] Track which prompts result in brand citations (from CHECK_VISIBILITY results)
- [ ] Build prompt intelligence into Citation Opportunity Finder (Task B-5)

---

### D-2. 🟡 Citation Velocity Tracking
**Status:** [ ] Not started

**What it does:** Track how quickly a brand gains/loses citations over time

**Action Steps:**
- [ ] Run Sentinel checks weekly for each monitored domain
- [ ] Store time-series data: `(domain, platform, citation_count, date)`
- [ ] Show velocity chart in Overview: "↑ +3 citations this week on Perplexity"
- [ ] Alert: "You gained a citation on Claude — here's what content triggered it"

---

## SECTION E — COST BENCHMARK (BEFORE VS AFTER) 📊

| Action | Current Cost | After Optimization | Savings |
|--------|-------------|-------------------|---------|
| Page crawl (per page) | ~$0.005 | ~$0.001 (fast-path) | 80% |
| Page summary | ~$0.010 | ~$0.001 (Flash Lite) | 90% |
| AEO analysis (per page) | ~$0.030 | ~$0.008 (Flash + caching) | 73% |
| Visibility check (8 platforms) | ~$0.040 | ~$0.010 (Flash + batch) | 75% |
| Schema generation | ~$0.020 | ~$0.002 (Flash Lite) | 90% |
| Social analysis | N/A | ~$0.015 (new feature) | NEW |
| **10-page full audit TOTAL** | **~$0.40** | **~$0.08** | **80%** |
| **Revenue per audit (Starter)** | $0.98 | $0.98 | — |
| **Gross margin** | ~59% | ~92% | +33pts |

---

## SECTION F — EXECUTION ORDER (SPRINT PLAN)

### Sprint 1 (This Week) — Cost Reduction + Reliability
- [ ] A-1: Gemini Flash Lite for summaries
- [ ] A-3: Smart token budgeting
- [ ] A-8: Structured JSON output (stop parse failures)
- [ ] B-8: AI Bot crawl permission checker (unique + $0 cost)
- [ ] A-6: Free crawl fast-path

### Sprint 2 (Week 2) — New Features
- [ ] B-1: Page-by-page AI perception summary
- [ ] B-3: Technical audit (robots.txt AI bot check, PageSpeed, schema validation)
- [ ] B-7: AEO score with checklist
- [ ] C-3: Letter grade (A–F) system

### Sprint 3 (Week 3) — Big Differentiators
- [ ] B-2: Social media presence analysis
- [ ] A-2: Context caching implementation
- [ ] A-5: Batch processing
- [ ] B-9: Schema auto-generator

### Sprint 4 (Week 4) — Competitor Moat
- [ ] B-4: GEO Improvement Roadmap
- [ ] B-6: Competitor gap analysis upgrade
- [ ] D-1: AI Prompt Intelligence Database
- [ ] C-1: Add Grok + DeepSeek + Meta AI tracking

### Sprint 5 (Month 2) — Revenue + Retention
- [ ] B-5: SEO basics with GSC data
- [ ] B-10: Content freshness monitoring
- [ ] D-2: Citation velocity tracking
- [ ] A-7: Supabase result caching

---

## SECTION G — RESEARCH LINKS 🔗

### API Pricing
- Gemini API Pricing: https://ai.google.dev/gemini-api/docs/pricing
- Gemini Context Caching: https://ai.google.dev/gemini-api/docs/caching
- Gemini Structured Output: https://ai.google.dev/gemini-api/docs/structured-output
- Gemini Batch API: https://ai.google.dev/gemini-api/docs/batch
- Gemini Google Search Grounding: https://ai.google.dev/gemini-api/docs/grounding
- Gemini URL Context: https://ai.google.dev/gemini-api/docs/url-context

### Competitor Research
- Profound Review 2026: https://getmint.ai/resources/profound-review
- Frase Pricing & API: https://www.frase.io/pricing
- Peec AI Pricing: https://peec.ai/pricing
- AthenaHQ Pricing: https://athenahq.ai/plans
- OpenLens (free): https://tryopenlens.com
- Relixir vs Profound: https://relixir.ai/blog/relixir-vs-profound-vs-athenahq-2025-geo-aeo-platforms-comparison
- Top AEO Tools 2026: https://aiclicks.io/blog/best-aeo-tracking-tools

### Technical References
- AI Bot User Agents: https://platform.openai.com/docs/gptbot
- Google Extended (Gemini bot): https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers
- ClaudeBot info: https://support.anthropic.com/en/articles/8896518
- PageSpeed Insights API: https://developers.google.com/speed/docs/insights/v5/get-started
- Schema.org Validator: https://validator.schema.org/
- Google Featured Snippets guide: https://developers.google.com/search/docs/appearance/featured-snippets
- GSC API (already integrated): https://developers.google.com/webmaster-tools

### Market Research
- AEO/GEO Trends 2025: https://owdt.com/insight/aeo-trends/
- GEO Market Size 2026: https://conductor.com/academy/aeo-geo-benchmarks-report/
- Zero-click search data: https://sparktoro.com/blog/zero-click-searches

---

## SECTION H — COST PER AUDIT TARGET 🎯

```
TARGET: Under $0.05 per 10-page audit

Current state:     ~$0.35–0.40 per 10-page audit
After Sprint 1:    ~$0.15–0.20 (cost fixes done)
After Sprint 3:    ~$0.08–0.10 (caching + batch)
After Sprint 5:    ~$0.04–0.06 (full optimization)

This means at $49/month with 50 audits:
Revenue per audit:    $0.98
API cost per audit:   $0.05
Gross margin on API:  ~95%

Competitors (estimated):
  Frase ($39/mo):   ~$0.20 cost/audit → 75% margin
  Profound ($399):  ~$1.50 cost/audit → 85% margin (enterprise scale)
  Peec AI ($99):    ~$0.10 cost/audit → 80% margin

WE WILL HAVE THE BEST MARGIN IN THE CATEGORY
while delivering MORE features.
```

---

*This task list is a living document. Update status as tasks complete.*
*Next review: End of Sprint 1 (1 week from creation)*
