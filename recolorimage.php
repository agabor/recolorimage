<?php
/**
 * Plugin Name: Recolor Image
 * Description: Transform images by mapping their colors to a custom palette using luminance mapping and color adjustment.
 * Version: 1.0.0
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
    }

    public function register_assets() {
        wp_register_script(
            'recolorimage',
            plugin_dir_url(__FILE__) . 'dist/assets/index.js',
            array(),
            '1.0.0',
            true
        );
        
        wp_register_style(
            'recolorimage',
            plugin_dir_url(__FILE__) . 'dist/assets/style.css',
            array(),
            '1.0.0'
        );
    }

    public function maybe_enqueue_assets() {
        if ($this->shortcode_used) {
            wp_enqueue_script('recolorimage');
            wp_enqueue_style('recolorimage');
            
            // Add plugin base URL to window object
            wp_add_inline_script('recolorimage', 'window.recolorImagesPlugin = { baseUrl: "' . plugin_dir_url(__FILE__) . 'dist" };', 'before');
        }
    }

    public function render_shortcode($atts) {
        $this->shortcode_used = true;
        
        // Get the pre-rendered HTML from the index.html file
        $html_file = plugin_dir_path(__FILE__) . 'dist/index.html';
        
        if (file_exists($html_file)) {
            $html_content = file_get_contents($html_file);
            
            // Extract just the app div with its pre-rendered content
            preg_match('/<div id="recolorimage-app">(.*?)<\/div>/s', $html_content, $matches);
            
            if (!empty($matches[0])) {
                return $matches[0];
            }
        }
        
        // Fallback to empty div if pre-rendered HTML is not available
        return '<div id="recolorimage-app"></div>';
    }
}

// Initialize plugin
RecolorImages::get_instance();
