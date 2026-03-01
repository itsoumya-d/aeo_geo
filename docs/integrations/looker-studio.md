# Google Looker Studio Integration Guide

## Overview

The Cognition AI Looker Studio connector allows you to visualize your AI visibility metrics, competitor data, and recommendations directly in Google Looker Studio dashboards. Build custom reports, track trends over time, and share insights with your team or clients.

## Features

- **4 Data Endpoints**: Audits, Trends, Competitors, Recommendations
- **Real-time Data**: Auto-refreshes from your Cognition account
- **Customizable Dashboards**: Build any chart or table you need
- **Client Reporting**: Perfect for agencies managing multiple brands
- **Historical Analysis**: Track visibility changes over weeks/months

## Prerequisites

1. **Cognition AI Account**: Pro, Agency, or Enterprise tier required
2. **API Key**: Generate from Settings → API Keys
3. **Google Account**: Access to Google Looker Studio (free)

## Step 1: Generate API Key

1. Log into your Cognition AI account
2. Navigate to **Settings → API Keys**
3. Click **Create New API Key**
4. Enter a name: `Looker Studio Connector`
5. Select permissions: **read:audits** (required)
6. Copy the API key (starts with `cog_`) - you won't see it again!

## Step 2: Deploy the Connector (One-Time Setup)

The Looker Studio connector is already deployed as a Supabase Edge Function. You'll connect to it using your API key.

**Connector Base URL**:
```
https://YOUR-PROJECT.supabase.co/functions/v1/looker-connector
```

Replace `YOUR-PROJECT` with your Supabase project ID (found in `.env.local` as `VITE_SUPABASE_URL`).

## Step 3: Create a Looker Studio Report

### Option A: Use Pre-Built Template (Recommended)

1. Go to [Looker Studio](https://lookerstudio.google.com/)
2. Click **Template Gallery** → Search for "Cognition AI"
3. Click **Use Template**
4. When prompted for credentials:
   - **API Key**: Paste your `cog_...` key
   - **Connector URL**: Enter your base URL from Step 2
5. Click **Connect**

### Option B: Build Custom Report

1. Go to [Looker Studio](https://lookerstudio.google.com/)
2. Click **Create → Data Source**
3. Choose **Community Connector**
4. Search for "Cognition AI" or select **Partner Connector**
5. Enter connection details:
   - **Connector URL**: Your base URL from Step 2
   - **API Key**: Your `cog_...` key
6. Click **Connect**

## Step 4: Configure Data Source

After connecting, you'll see 4 available endpoints. Choose one to start:

### Endpoint 1: Audits Data

**Best For**: Overall visibility scores, audit history, platform breakdowns

**Available Fields**:
- **Dimensions**: Domain, Platform, Audit Date, Status
- **Metrics**: Visibility Score (0-100), Quote Likelihood, Citations Found, Audit Count

**Example Use Cases**:
- Scorecard showing average visibility score
- Time-series chart of scores by platform
- Table of recent audits with status

**Query Parameters**:
```
?start_date=2024-01-01&end_date=2024-12-31&platform=ChatGPT&limit=1000
```

### Endpoint 2: Trends Data

**Best For**: Time-series analysis, competitor comparisons, tracking improvements

**Available Fields**:
- **Dimensions**: Date, Platform, Domain
- **Metrics**: Visibility Score, Competitor Avg Score, Score Delta

**Example Use Cases**:
- Line chart showing score trends over time
- Comparison of your score vs competitors
- Heatmap of performance by platform and date

**Query Parameters**:
```
?start_date=2024-01-01&end_date=2024-12-31&platform=Gemini
```

### Endpoint 3: Competitors Data

**Best For**: Competitive intelligence, benchmarking, market positioning

**Available Fields**:
- **Dimensions**: Competitor Domain, Platform, Captured Date
- **Metrics**: Competitor Score, Keywords Tracked, Citations Found

**Example Use Cases**:
- Bar chart ranking competitors by score
- Table showing competitor performance per platform
- Trend of competitor citations over time

**Query Parameters**:
```
?start_date=2024-01-01&platform=Claude&domain=competitor.com
```

### Endpoint 4: Recommendations Data

**Best For**: Action planning, prioritization, tracking implementation

**Available Fields**:
- **Dimensions**: Page URL, Impact Level, Effort Required, Status, Recommendation Text, Captured Date
- **Metrics**: Quote Likelihood, Recommendation Count

**Example Use Cases**:
- Priority matrix (Impact vs Effort scatter plot)
- Kanban board showing recommendations by status
- Table of high-impact recommendations

**Query Parameters**:
```
?start_date=2024-01-01&domain=yoursite.com&limit=500
```

## Step 5: Build Your First Chart

Let's create a simple visibility score scorecard:

1. Select **Audits** endpoint as your data source
2. Click **Add a Chart → Scorecard**
3. In the chart editor:
   - **Metric**: Select `Visibility Score`
   - **Date Range**: Last 30 days
4. Customize appearance:
   - **Style → Metric Color**: Set thresholds (0-59: Red, 60-79: Yellow, 80-100: Green)
   - **Comparison Type**: Previous period
5. Click **View** to see your scorecard!

## Common Dashboard Examples

### 1. Executive Summary Dashboard

**Components**:
- Scorecard: Average Visibility Score (last 30 days)
- Line Chart: Visibility Score Trend (daily, last 90 days)
- Bar Chart: Score by Platform (current week)
- Table: Recent Audits (top 10)

**Data Sources**: Audits + Trends

### 2. Competitive Intelligence Dashboard

**Components**:
- Scorecard: Your Score vs Competitor Avg
- Multi-line Chart: Your Score vs Top 3 Competitors (over time)
- Heatmap: Competitor Performance by Platform
- Table: Competitor Rankings with Delta

**Data Sources**: Trends + Competitors

### 3. Content Optimization Dashboard

**Components**:
- Scatter Plot: Recommendations (Impact vs Effort)
- Pie Chart: Recommendations by Status
- Table: High-Impact Recommendations (filterable by page)
- Bar Chart: Pages by Quote Likelihood

**Data Sources**: Recommendations

### 4. Agency Client Report

**Components**:
- Client Scorecard: Visibility Score with Logo
- Platform Breakdown: 8 AI Platforms (radar chart)
- Progress Chart: Month-over-month improvements
- Action Items Table: Top 5 recommendations

**Data Sources**: Audits + Recommendations

## Advanced Features

### Filtering by Date Range

All endpoints support `start_date` and `end_date` parameters:

1. In Looker Studio, click **Date Range Control**
2. Set default range (e.g., Last 30 Days)
3. The connector automatically passes dates to the API

### Multi-Domain Tracking (Agency Tier)

If you manage multiple domains:

1. Use `domain` query parameter to filter
2. Create separate data sources per client domain
3. Combine in one dashboard using **Data Blending**

### Scheduled Email Reports

1. In Looker Studio, click **Share → Schedule Email Delivery**
2. Choose frequency (daily, weekly, monthly)
3. Add recipients (clients, team members)
4. Reports auto-update with latest data

### Custom Metrics

Create calculated fields for custom insights:

**Example: Visibility Growth %**
```
(Current Score - Previous Score) / Previous Score * 100
```

**Example: Citation Rate**
```
Citations Found / Impressions * 100
```

## Rate Limits

The Looker Studio connector has separate rate limits from the main API:

- **Limit**: 100 requests per hour per organization
- **Window**: 1 hour rolling window
- **Overage**: Returns 429 error with retry info

**Best Practices**:
- Use caching (data refreshes every 1-2 hours automatically)
- Avoid real-time refreshes in dashboards (use scheduled refresh)
- For high-volume reporting, contact support for limit increase

## Caching Behavior

To optimize performance, connector responses are cached:

| Endpoint | Cache TTL | Refresh Frequency |
|----------|-----------|-------------------|
| Audits | 1 hour | Hourly |
| Trends | 2 hours | Every 2 hours |
| Competitors | 1 hour | Hourly |
| Recommendations | 1 hour | Hourly |

**Force Refresh**: Re-run the audit in Cognition AI to invalidate cache.

## Troubleshooting

### Error: "Invalid API key"

**Cause**: API key is incorrect, expired, or revoked.

**Solution**:
1. Generate a new API key in Settings
2. Update the data source credentials in Looker Studio
3. Ensure key has `read:audits` permission

### Error: "Rate limit exceeded"

**Cause**: More than 100 requests in 1 hour.

**Solution**:
1. Reduce dashboard refresh frequency
2. Use cached data (don't force refresh)
3. Contact support for limit increase (Enterprise tier)

### Error: "No data available"

**Cause**: No audits match the date range or filters.

**Solution**:
1. Expand date range (try Last 90 Days)
2. Remove platform/domain filters
3. Run a new audit in Cognition AI

### Charts Not Updating

**Cause**: Cached data or refresh needed.

**Solution**:
1. Click **Resource → Manage Added Data Sources**
2. Click **Edit** on Cognition connector
3. Click **Refresh Fields**
4. Return to dashboard and hard refresh (Ctrl+Shift+R)

## Data Privacy & Security

- **Encryption**: All API calls use HTTPS/TLS 1.3
- **Authentication**: API keys are hashed (SHA-256) server-side
- **Access Control**: Keys scoped to organization, permissions enforced
- **Data Residency**: Data processed via Supabase (AWS US-East-1)
- **Compliance**: SOC 2 Type II certified (Enterprise tier only)

**Important**: Looker Studio dashboards can be shared publicly. Ensure sensitive data is not exposed in public dashboards.

## API Reference

### Base URL
```
https://YOUR-PROJECT.supabase.co/functions/v1/looker-connector
```

### Authentication
```
Headers:
  x-api-key: cog_YOUR_API_KEY_HERE
```

### Endpoints

#### GET /audits
Returns audit history with visibility scores.

**Query Parameters**:
- `start_date` (optional): ISO-8601 date (e.g., `2024-01-01`)
- `end_date` (optional): ISO-8601 date
- `platform` (optional): `ChatGPT|Gemini|Claude|Perplexity|Google AI Overviews|Microsoft Copilot|Meta AI|Grok`
- `domain` (optional): Filter by domain URL
- `limit` (default: 1000): Max rows to return
- `offset` (default: 0): Pagination offset

**Response**:
```json
[
  {
    "domain": "example.com",
    "platform": "ChatGPT",
    "created_at": "2024-01-15T10:30:00Z",
    "status": "completed",
    "overall_score": 82,
    "quote_likelihood": 75,
    "citations_found": 12
  }
]
```

#### GET /trends
Returns time-series visibility data with competitor comparisons.

**Query Parameters**: Same as `/audits` (except no `status` filter)

**Response**:
```json
[
  {
    "date": "2024-01-15",
    "platform": "Gemini",
    "domain": "example.com",
    "score": 78,
    "competitor_avg_score": 65,
    "delta": 13
  }
]
```

#### GET /competitors
Returns competitor benchmark snapshots.

**Query Parameters**: Same as `/audits`

**Response**:
```json
[
  {
    "competitor_domain": "competitor.com",
    "platform": "Claude",
    "captured_at": "2024-01-15T10:00:00Z",
    "score": 68,
    "keywords_tracked": 25,
    "citations_found": 8
  }
]
```

#### GET /recommendations
Returns page-level recommendations from audits.

**Query Parameters**:
- `start_date`, `end_date`, `domain`, `limit`, `offset` (same as above)
- No `platform` filter (recommendations are platform-agnostic)

**Response**:
```json
[
  {
    "page_url": "https://example.com/product",
    "impact": "high",
    "effort": "medium",
    "status": "pending",
    "recommendation": "Add FAQ schema markup to improve Q&A visibility",
    "quote_likelihood": 68,
    "captured_at": "2024-01-15"
  }
]
```

## Support

- **Documentation**: [docs.cognition.ai](https://docs.cognition.ai)
- **Community**: [community.cognition.ai](https://community.cognition.ai)
- **Email Support**: support@cognition.ai
- **Live Chat**: Available in-app (Pro/Agency/Enterprise)

## Changelog

**v1.0.0** (2024-02-15)
- Initial release with 4 endpoints
- Support for all 8 AI platforms
- Rate limiting: 100 req/hour
- Caching: 1-2 hour TTL

---

**Need help?** Contact our support team or join our community to share dashboard templates and best practices!
