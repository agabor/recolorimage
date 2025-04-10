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
        return '<div class="app"><div class="app" data-v-inspector="src/App.vue:127:3"><div class="app-container" data-v-inspector="src/App.vue:128:5"><!-- Image Upload --><section class="section" data-v-inspector="src/App.vue:130:9"><div class="dropzone" data-v-inspector="src/App.vue:131:11" data-v-0b4b971b><input type="file" accept="image/jpeg, image/png" class="file-input" data-v-inspector="src/components/ImageUploader.vue:201:5" data-v-0b4b971b><div class="dropzone-content" data-v-inspector="src/components/ImageUploader.vue:209:5" data-v-0b4b971b><div data-v-inspector="src/components/ImageUploader.vue:255:7" data-v-0b4b971b><i class="fa-duotone fa-light fa-cloud-arrow-up upload-icon" data-v-inspector="src/components/ImageUploader.vue:256:9" data-v-0b4b971b></i><h3 data-v-inspector="src/components/ImageUploader.vue:257:9" data-v-0b4b971b>Drag &amp; Drop Image</h3><p data-v-inspector="src/components/ImageUploader.vue:258:9" data-v-0b4b971b>or click to browse</p><p class="file-types" data-v-inspector="src/components/ImageUploader.vue:259:9" data-v-0b4b971b>Supported formats: JPG, PNG (max 1000×1000px)</p></div></div></div></section><!-- Palette Section --><section class="section" data-v-inspector="src/App.vue:141:9"><div class="palette-selector" data-v-inspector="src/App.vue:142:11"><label for="palette-select" data-v-inspector="src/App.vue:143:13">Select Palette:</label><select id="palette-select" class="button" data-v-inspector="src/App.vue:144:13"><!--[--><option value="nord" data-v-inspector="src/App.vue:145:15" selected>Nord</option><option value="solarized" data-v-inspector="src/App.vue:145:15">Solarized</option><option value="monokai" data-v-inspector="src/App.vue:145:15">Monokai</option><!--]--></select></div></section><section class="section" data-v-inspector="src/App.vue:152:9"><!-- Luminance Palette --><div class="section-header" data-v-inspector="src/App.vue:154:11"><h3 data-v-inspector="src/App.vue:155:13">Luminance Palette</h3><div class="palette-actions" data-v-inspector="src/App.vue:156:13"><button class="edit-mode-btn button" title="Toggle edit mode" data-v-inspector="src/App.vue:157:15"><i class="fa-duotone fa-light fa-pencil" data-v-inspector="src/App.vue:163:17"></i> Edit Colors </button><!----></div></div><div class="luminance-swatches" data-v-inspector="src/App.vue:175:11"><!--[--><div class="color-swatch luminance-swatch" data-v-inspector="src/App.vue:176:13"><div class="color-display" style="background-color:#2e3440;" data-v-inspector="src/App.vue:181:15"></div><!----></div><div class="color-swatch luminance-swatch" data-v-inspector="src/App.vue:176:13"><div class="color-display" style="background-color:#3b4252;" data-v-inspector="src/App.vue:181:15"></div><!----></div><div class="color-swatch luminance-swatch" data-v-inspector="src/App.vue:176:13"><div class="color-display" style="background-color:#434c5e;" data-v-inspector="src/App.vue:181:15"></div><!----></div><div class="color-swatch luminance-swatch" data-v-inspector="src/App.vue:176:13"><div class="color-display" style="background-color:#4c566a;" data-v-inspector="src/App.vue:181:15"></div><!----></div><div class="color-swatch luminance-swatch" data-v-inspector="src/App.vue:176:13"><div class="color-display" style="background-color:#d8dee9;" data-v-inspector="src/App.vue:181:15"></div><!----></div><div class="color-swatch luminance-swatch" data-v-inspector="src/App.vue:176:13"><div class="color-display" style="background-color:#e5e9f0;" data-v-inspector="src/App.vue:181:15"></div><!----></div><div class="color-swatch luminance-swatch" data-v-inspector="src/App.vue:176:13"><div class="color-display" style="background-color:#eceff4;" data-v-inspector="src/App.vue:181:15"></div><!----></div><!--]--></div><!-- Hue Palette --><h3 data-v-inspector="src/App.vue:208:11">Hue Palette <small data-v-inspector="src/App.vue:208:27">(click to enable/disable)</small></h3><div class="hue-swatches" data-v-inspector="src/App.vue:209:11"><!--[--><div class="color-swatch" data-v-inspector="src/App.vue:210:13"><div class="color-display" style="background-color:#8fbcbb;" data-v-inspector="src/App.vue:221:15"></div><!----></div><div class="color-swatch" data-v-inspector="src/App.vue:210:13"><div class="color-display" style="background-color:#88c0d0;" data-v-inspector="src/App.vue:221:15"></div><!----></div><div class="color-swatch" data-v-inspector="src/App.vue:210:13"><div class="color-display" style="background-color:#81a1c1;" data-v-inspector="src/App.vue:221:15"></div><!----></div><div class="color-swatch" data-v-inspector="src/App.vue:210:13"><div class="color-display" style="background-color:#5e81ac;" data-v-inspector="src/App.vue:221:15"></div><!----></div><div class="color-swatch" data-v-inspector="src/App.vue:210:13"><div class="color-display" style="background-color:#bf616a;" data-v-inspector="src/App.vue:221:15"></div><!----></div><div class="color-swatch" data-v-inspector="src/App.vue:210:13"><div class="color-display" style="background-color:#d08770;" data-v-inspector="src/App.vue:221:15"></div><!----></div><div class="color-swatch" data-v-inspector="src/App.vue:210:13"><div class="color-display" style="background-color:#ebcb8b;" data-v-inspector="src/App.vue:221:15"></div><!----></div><div class="color-swatch" data-v-inspector="src/App.vue:210:13"><div class="color-display" style="background-color:#a3be8c;" data-v-inspector="src/App.vue:221:15"></div><!----></div><div class="color-swatch" data-v-inspector="src/App.vue:210:13"><div class="color-display" style="background-color:#b48ead;" data-v-inspector="src/App.vue:221:15"></div><!----></div><!--]--></div></section><!-- Advanced Settings Button --><button class="advanced-settings-btn button" data-v-inspector="src/App.vue:249:9">Show Advanced Settings</button><!-- Processing Controls --><!----><button class="process-btn" disabled data-v-inspector="src/App.vue:298:9"><span data-v-inspector="src/App.vue:304:13">Recolor Image</span></button></div></div></div>';
    }
}

// Initialize plugin
RecolorImages::get_instance();
