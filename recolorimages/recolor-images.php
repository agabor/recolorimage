<?php
/**
 * Plugin Name: Recolor Images
 * Description: Transform images by mapping their colors to a custom palette using luminance mapping and color adjustment.
 * Version: 1.0.0
 * Author: CodeSharp
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
        add_shortcode('recolor_images', array($this, 'render_shortcode'));
        add_action('wp_enqueue_scripts', array($this, 'register_assets'));
        add_action('wp_footer', array($this, 'maybe_enqueue_assets'));
    }

    public function register_assets() {
        wp_register_script(
            'recolor-images',
            plugin_dir_url(__FILE__) . 'dist/assets/index.js',
            array(),
            '1.0.0',
            true
        );
        
        wp_register_style(
            'recolor-images',
            plugin_dir_url(__FILE__) . 'dist/assets/style.css',
            array(),
            '1.0.0'
        );
    }

    public function maybe_enqueue_assets() {
        if ($this->shortcode_used) {
            wp_enqueue_script('recolor-images');
            wp_enqueue_style('recolor-images');
            
            // Add plugin base URL to window object
            wp_add_inline_script('recolor-images', 'window.recolorImagesPlugin = { baseUrl: "' . plugin_dir_url(__FILE__) . 'dist" };', 'before');
        }
    }

    public function render_shortcode($atts) {
        $this->shortcode_used = true;
        return '<div id="recolor-images-app"></div>';
    }
}

// Initialize plugin
RecolorImages::get_instance();
