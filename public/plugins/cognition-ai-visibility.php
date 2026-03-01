<?php
/**
 * Plugin Name: Cognition AI Visibility
 * Plugin URI: https://cognition-ai.com
 * Description: Monitor your AI visibility score directly from your WordPress dashboard.
 * Version: 1.0.0
 * Author: Cognition AI
 * Author URI: https://cognition-ai.com
 * License: GPL2
 */

if (!defined('ABSPATH')) exit;

class CognitionAI_Plugin {
    private $api_url = 'https://api.cognition-ai.com/v1';

    public function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('wp_dashboard_setup', array($this, 'add_dashboard_widget'));
    }

    public function add_admin_menu() {
        add_options_page(
            'Cognition AI',
            'Cognition AI',
            'manage_options',
            'cognition-ai',
            array($this, 'settings_page')
        );
    }

    public function register_settings() {
        register_setting('cognition_ai_options', 'cognition_api_key');
    }

    public function settings_page() {
        ?>
        <div class="wrap">
            <h1>Cognition AI Settings</h1>
            <form method="post" action="options.php">
                <?php settings_fields('cognition_ai_options'); ?>
                <?php do_settings_sections('cognition_ai_options'); ?>
                <table class="form-table">
                    <tr valign="top">
                        <th scope="row">API Key</th>
                        <td>
                            <input type="password" name="cognition_api_key" value="<?php echo esc_attr(get_option('cognition_api_key')); ?>" style="width: 400px;" />
                            <p class="description">Get your API key from the <a href="https://app.cognition-ai.com/settings/integrations" target="_blank">Cognition Dashboard</a>.</p>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    public function add_dashboard_widget() {
        add_meta_box(
            'cognition_ai_dashboard_widget',
            'Cognition AI Visibility Score',
            array($this, 'render_dashboard_widget'),
            'dashboard',
            'side',
            'high'
        );
    }

    public function render_dashboard_widget() {
        $api_key = get_option('cognition_api_key');

        if (empty($api_key)) {
            echo '<p>Please configure your <a href="options-general.php?page=cognition-ai">API Key</a> to see your score.</p>';
            return;
        }

        // Fetch data from API
        $response = wp_remote_get($this->api_url . '/audits?limit=1', array(
            'headers' => array(
                'x-api-key' => $api_key,
                'Content-Type' => 'application/json'
            )
        ));

        if (is_wp_error($response)) {
            echo '<p style="color: red;">Error connecting to Cognition AI.</p>';
            return;
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        if (empty($data['audits']) || !isset($data['audits'][0])) {
            echo '<p>No audits found. <a href="https://app.cognition-ai.com" target="_blank">Run your first audit</a>.</p>';
            return;
        }

        $latest_audit = $data['audits'][0];
        $score = $latest_audit['overall_score'];
        $color = $score >= 80 ? '#10B981' : ($score >= 50 ? '#F59E0B' : '#EF4444');

        ?>
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 48px; font-weight: bold; color: <?php echo $color; ?>;">
                <?php echo $score; ?>
            </div>
            <p style="margin-top: 5px; color: #666; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; font-weight: bold;">Current Visibility Score</p>
            
            <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                <a href="https://app.cognition-ai.com/dashboard" target="_blank" class="button button-primary">View Full Report</a>
            </div>
        </div>
        <?php
    }
}

new CognitionAI_Plugin();
