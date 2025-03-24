# Recolor Images WordPress Plugin

This WordPress plugin integrates the Recolor Images Vue.js application into WordPress sites using a shortcode.

## Installation

1. Build the plugin:
```bash
cd recolorimages
npm install
npm run build:plugin
```

2. The build process will create a `plugin-build/recolor-images.zip` file.

3. Install the plugin in WordPress:
   - Go to Plugins > Add New > Upload Plugin
   - Select the `recolor-images.zip` file
   - Click "Install Now"
   - After installation completes, click "Activate"

## Usage

Use the shortcode `[recolor_images]` in any post or page where you want to display the Recolor Images application.

Example:
```
[recolor_images]
```

The plugin will automatically load all necessary JavaScript and CSS files only on pages where the shortcode is used.

## Development

To work on the Vue.js application in development mode:

1. Run the development server:
```bash
npm run dev
```

2. Make your changes to the Vue.js application
3. Build for production when ready:
```bash
npm run build
```

4. Copy the updated `dist` directory to your WordPress plugin installation

## Notes

- The plugin uses conditional asset loading, meaning the JavaScript and CSS files are only loaded on pages where the shortcode is present
- The Vue.js application is mounted to an element with ID `recolor-images-app`
- All assets are properly minified and optimized for production use
