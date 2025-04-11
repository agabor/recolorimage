<?php
/**
 * Plugin Name: Recolor Image
 * Description: Transform images by mapping their colors to a custom palette using luminance mapping and color adjustment.
 * Version: %%VERSION%%
 * Author: Gabor Angyal
 * GitHub Plugin URI: agabor/recolorimage
 */

if (!defined('ABSPATH')) {
    exit;
}

class RecolorImages {
    private static $instance = null;
    private $shortcode_used = false;

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_shortcode('recolorimage', array($this, 'render_shortcode'));
        add_action('wp_enqueue_scripts', array($this, 'register_assets'));
        add_action('wp_footer', array($this, 'maybe_enqueue_assets'));
        add_action('wp_ajax_fetch_wp_styles', array($this, 'fetch_wp_styles'));
        add_action('wp_ajax_nopriv_fetch_wp_styles', array($this, 'fetch_wp_styles'));
    }

    public function register_assets() {
        wp_register_script(
            'recolorimage',
            plugin_dir_url(__FILE__) . 'dist/assets/index.js',
            array(),
            '%%VERSION%%',
            true
        );
        
        wp_register_style(
            'recolorimage',
            plugin_dir_url(__FILE__) . 'dist/assets/style.css',
            array(),
            '%%VERSION%%'
        );
    }

    public function maybe_enqueue_assets() {
        if ($this->shortcode_used) {
            wp_enqueue_script('recolorimage');
            wp_enqueue_style('recolorimage');
            
            // Add plugin base URL to window object
            wp_add_inline_script('recolorimage', 
                'window.recolorImagesPlugin = { 
                    baseUrl: "' . plugin_dir_url(__FILE__) . 'dist"
                };', 
                'before'
            );
        }
    }

    /**
     * AJAX endpoint to fetch WordPress styles from external sites
     */
    public function fetch_wp_styles() {
        // Verify nonce if needed
        
        // Get the URL from the request
        $url = isset($_GET['url']) ? esc_url_raw($_GET['url']) : '';
        
        if (empty($url)) {
            wp_send_json_error('URL is required');
            return;
        }

        // Fetch the content
        $response = wp_remote_get($url);
        
        if (is_wp_error($response)) {
            wp_send_json_error($response->get_error_message());
            return;
        }

        $body = wp_remote_retrieve_body($response);
        
        if (empty($body)) {
            wp_send_json_error('Empty response from URL');
            return;
        }

        // Send the response
        wp_send_json_success(array(
            'html' => $body
        ));
    }

    public function render_shortcode($atts) {
        $this->shortcode_used = true;
        return '<!-- SSR_APP_PLACEHOLDER -->';
    }
}

// Initialize plugin
RecolorImages::get_instance();
