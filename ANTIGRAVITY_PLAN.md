# AntiGravity Audit & Enhancement Plan

**Date:** January 24, 2026
**Project:** Cognition AI Visibility Engine
**Objective:** Redesign and optimize core flows (Onboarding, Dashboard, Billing) to meet best-in-class 2026 standards for SaaS and AEO (Answer Engine Optimization) tools.

---

## 🚀 Phase 1: Onboarding Flow "First Strike"

**Context:** The current onboarding is functional but heavy on effects and low on interactive friction-reduction.
**Goal:** Reduce time-to-value and increase data quality (keywords/competitors).

### Task 1.1: Interactive "Chip" Input for Keywords & Competitors
*   **Research:** Studied 2025 best practices (Userpilot, Appcues). Users prefer "tag/chip" inputs over comma-separated text fields for clarity and editability.
*   **Frontend Task:**
    *   Replace `input type="text"` in `OnboardingWizard.tsx` (Steps 4 & 5) with a custom `<TagInput />` component.
    *   **Features:**
        *   Type and press Enter to add.
        *   "X" to remove a tag.
        *   Auto-suggest (mocked or API-based) for common competitors/keywords.
    *   **Animation:** Use `framer-motion` `LayoutGroup` for smooth reordering/adding of chips.
*   **Backend Task:** No schema change needed (arrays already supported), but ensure `updateOnboardingStatus` validates array length (e.g., max 10 keywords).
*   **Market Impact:** Increases user investment and data accuracy, leading to better initial reports.

### Task 1.2: Proactive Domain Verification
*   **Research:** Best-in-class tools (Google Search Console, HeyGen) verify in the background rather than making the user click "Verify" repeatedly.
*   **Frontend Task:**
    *   In `OnboardingWizard.tsx` (Step 3), implement a `useInterval` poller that checks verification status every 5 seconds once the user lands on the step.
    *   Show a "Listening for token..." pulsing status.
    *   Auto-advance to next step upon success with a "Success" animation.
*   **Backend Task:** Optimize `verify-domain` function to be lightweight for polling.
*   **UX Improvement:** Removes the "fear of failure" button click; feels magical when it just works.

---

## 📊 Phase 2: AEO Dashboard & Visualization

**Context:** Current dashboard uses basic Recharts. AEO requires visualizing "Semantic Space" and "Entity Relationships".
**Goal:** Position the tool as a *next-gen* AI visibility engine, not just another SEO tool.

### Task 2.1: "Semantic Territory" Radar Chart
*   **Research:** 2026 AEO dashboards focus on "Entity Dominance".
*   **Frontend Task:**
    *   In `OverviewTab.tsx`, replace the standard Bar Chart with a "Semantic Radar" (Spider Chart).
    *   **Axes:** Brand Authority, Content Depth, Technical Health, Entity Connection, Sentiment.
    *   **Overlay:** Compare "You" vs. "Average Competitor".
*   **Backend Task:** Update `dashboard-stats` API to return normalized scores (0-100) for these 5 specific axes.
*   **Market Impact:** Visually demonstrates the multi-dimensional nature of AI visibility.

### Task 2.2: Action-Oriented "Critical Path" Cards
*   **Research:** Users ignore lists. They act on "cards" that look like tickets.
*   **Frontend Task:**
    *   Redesign "Critical Optimization Actions" in `OverviewTab.tsx`.
    *   Style each recommendation as a "Ticket" with:
        *   **Difficulty Badge:** (Easy/Med/Hard)
        *   **Impact Score:** (+12% Visibility)
        *   **"Fix it for me" Button:** (Mocked AI action).
*   **UX Improvement:** Gamifies the optimization process.

---

## 💳 Phase 3: Trust-Based Billing

**Context:** Current billing is functional but lacks transparency on "Usage".
**Goal:** Reduce upgrade anxiety and support usage-based pricing transparency.

### Task 3.1: Stripe Elements & Portal Deep Integration
*   **Research:** Stripe Best Practices 2025.
*   **Frontend Task:**
    *   In `BillingDashboard.tsx`, replace custom "Upgrade" buttons with a direct "Manage Subscription" integration that opens the Stripe Customer Portal in a modal (if supported) or seamless redirect.
    *   Show "Invoice History" table directly in the dashboard using Stripe API data.
*   **Backend Task:** Create `get-invoices` edge function to proxy Stripe Invoice list to frontend.
*   **Market Impact:** Increases trust by showing financial history transparently.

### Task 3.2: Visual Usage Forecasting
*   **Research:** AWS/Twilio billing dashboards.
*   **Frontend Task:**
    *   Update `UsageBar` in `BillingDashboard.tsx`.
    *   Add a "Projected Usage" marker (lighter color bar) based on current velocity.
    *   Add "Days until reset" countdown.
*   **Backend Task:** Calculate simple linear projection based on `current_usage / days_passed`.

---

## 🛠 Shared UI/UX Refinements

### Task 4.1: "Glassmorphism 2.0" Refinement
*   **Research:** Modern dark interfaces (Linear, Raycast) use subtle borders and noise, not heavy blurs.
*   **Frontend Task:**
    *   Audit `index.css` and `tailwind.config.js`.
    *   Reduce `backdrop-blur` values (performance fix).
    *   Switch to "1px border with inner gradient" for cards instead of heavy shadows.
    *   **Accessibility:** Ensure text contrast ratios meet WCAG AA (some grey text is too dark).

### Task 4.2: Mobile Responsiveness Audit
*   **Frontend Task:**
    *   Fix `OverviewTab.tsx` grid for mobile (currently charts get squashed).
    *   Implement a "Bottom Sheet" navigation for mobile instead of top tabs.
