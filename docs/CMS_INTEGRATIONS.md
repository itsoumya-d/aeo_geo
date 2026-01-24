# CMS Integration Guide

This guide explains how to integrate Cognition AI Visibility Engine with popular CMS platforms.

## WordPress Integration

### Option 1: REST API Plugin

Create a WordPress plugin that fetches visibility data:

```php
<?php
/**
 * Plugin Name: Cognition AI Visibility
 * Description: Display AI visibility scores in WordPress admin
 * Version: 1.0.0
 */

class Cognition_AI_Plugin {
    private $api_key;
    private $api_url = 'https://api.cognition.ai/v1';

    public function __construct() {
        $this->api_key = get_option('cognition_api_key');
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);
    }

    public function add_admin_menu() {
        add_menu_page(
            'AI Visibility',
            'AI Visibility',
            'manage_options',
            'cognition-visibility',
            [$this, 'render_dashboard'],
            'dashicons-visibility'
        );
    }

    public function register_settings() {
        register_setting('cognition_settings', 'cognition_api_key');
    }

    public function get_visibility_score() {
        $response = wp_remote_get($this->api_url . '/visibility', [
            'headers' => ['Authorization' => 'Bearer ' . $this->api_key]
        ]);
        
        if (is_wp_error($response)) return null;
        return json_decode(wp_remote_retrieve_body($response), true);
    }

    public function render_dashboard() {
        $score = $this->get_visibility_score();
        include plugin_dir_path(__FILE__) . 'templates/dashboard.php';
    }
}

new Cognition_AI_Plugin();
```

### Option 2: Shortcode for Content Authors

```php
// Add to functions.php or custom plugin
add_shortcode('cognition_score', function($atts) {
    $api_key = get_option('cognition_api_key');
    $url = get_permalink();
    
    // Fetch score for this page
    $response = wp_remote_post('https://api.cognition.ai/v1/page-score', [
        'headers' => [
            'Authorization' => 'Bearer ' . $api_key,
            'Content-Type' => 'application/json'
        ],
        'body' => json_encode(['url' => $url])
    ]);
    
    $data = json_decode(wp_remote_retrieve_body($response), true);
    $score = $data['score'] ?? 'N/A';
    
    return "<span class='cognition-score'>AI Score: {$score}/100</span>";
});
```

---

## Webflow Integration

### Embed Component

Add this to your Webflow site's custom code:

```html
<!-- Cognition AI Widget -->
<script>
(function() {
    const COGNITION_KEY = 'your-api-key';
    
    async function fetchVisibility() {
        const response = await fetch('https://api.cognition.ai/v1/visibility', {
            headers: { 'Authorization': `Bearer ${COGNITION_KEY}` }
        });
        return response.json();
    }
    
    async function renderWidget() {
        const container = document.getElementById('cognition-widget');
        if (!container) return;
        
        const data = await fetchVisibility();
        container.innerHTML = `
            <div style="padding: 20px; background: #18181b; border-radius: 12px; color: white;">
                <h3 style="margin: 0 0 10px; font-size: 14px; opacity: 0.7;">AI Visibility Score</h3>
                <div style="font-size: 48px; font-weight: bold;">${data.overallScore}</div>
                <div style="font-size: 12px; opacity: 0.5;">Last updated: ${new Date(data.timestamp).toLocaleDateString()}</div>
            </div>
        `;
    }
    
    document.addEventListener('DOMContentLoaded', renderWidget);
})();
</script>

<div id="cognition-widget"></div>
```

### Webflow CMS Integration

For Webflow CMS collections, use Zapier:

1. **Trigger**: Cognition audit completes (webhook)
2. **Action**: Update Webflow CMS item with score

```json
{
  "trigger": "cognition.audit.completed",
  "action": "webflow.update_item",
  "mapping": {
    "cognition.overallScore": "webflow.ai_score_field",
    "cognition.recommendations[0].issue": "webflow.top_recommendation"
  }
}
```

---

## API Endpoints for CMS

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/visibility` | GET | Get current visibility score |
| `/v1/page-score` | POST | Score a specific page URL |
| `/v1/recommendations` | GET | Get top recommendations |
| `/v1/audit` | POST | Trigger new audit |

### Authentication

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://api.cognition.ai/v1/visibility
```

---

## Need Help?

- Email: support@cognition.ai
- Documentation: https://docs.cognition.ai/integrations
