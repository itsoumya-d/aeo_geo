# Release Notes - Cognition AI v2.0 (Enterprise Edition)

## Overview
This release transforms the Cognition AI Visibility Engine into a market-ready Enterprise GEO platform. It introduces critical revenue-enabling features, improved performance, and rigorous testing coverage.

## Highlights

### 🚀 Enterprise Features
- **Team Collaboration & RBAC**: Invite members, assign roles (Owner, Admin, Member, Viewer), and manage organization permissions.
- **Audit Logs**: Full activity tracking for security compliance, exportable to CSV.
- **SSO/SAML Support**: Enterprise-grade authentication configuration interface.
- **API Key Management**: Secure API access with usage tracking and rate limiting.

### 🧠 Advanced AI Capabilities
- **Multi-Model Support**: Compare visibility scores across Gemini 1.5 Pro, Claude 3.5 Sonnet, and GPT-4o.
- **Improved Routing**: Intelligent model selection based on analysis depth and user entitlements.

### 📊 Reporting & Analytics
- **White-Label PDF Reports**: Generating high-fidelity, printable audit reports with custom branding.
- **Enhanced Dashboard**: Lazy-loaded visualization tabs for faster initial load times.

### 🌐 SEO & Discoverability
- **Semantic Structure**: Optimzied Landing Page with standardized HTML5 `<details>`/`<summary>` for better AI indexing.
- **Rich Snippets**: Comprehensive Schema.org markup (Organization, SoftwareApplication, FAQPage) injected dynamically.
- **Open Graph**: Dynamic sharing cards for Twitter/X and LinkedIn.

### 🛠️ Technical Improvements
- **Performance**: Route-based code splitting and lazy loading for heavy libraries (Recharts, html2pdf).
- **Testing**: Added comprehensive Unit Tests for permission logic and E2E tests for critical flows.
- **Build Quality**: Verified zero build errors with strict TypeScript checks.

## Bug Fixes
- Fixed type safety issues in `TeamSettings.tsx`.
- Resolved `toast` provider context issues in unit tests.
- Improved loading state handling during data fetching.

## Known Issues
- OAuth login in E2E tests is mocked; manual verification of Google Sign-In is recommended before deployment.
- "Skip to Content" accessibility test may fail on WebKit (Safari) due to default OS focus settings, but functions correctly in production.
