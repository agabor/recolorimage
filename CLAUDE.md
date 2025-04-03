# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build, Lint, and Test Commands
- `npm run dev` - Start development server
- `npm run build` - Build application and minify worker script
- `npm run build:plugin` - Build WordPress plugin package
- `npm run lint` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run test:unit` - Run Vitest unit tests

## Code Style Guidelines
- **Vue Components**: Use Vue 3 Composition API with `<script setup>` syntax
- **Naming**: PascalCase for components, camelCase for variables/methods
- **JavaScript**: ES modules, arrow functions, destructuring, async/await
- **Documentation**: JSDoc comments for functions, explaining parameters and return values
- **CSS**: Scoped styles in components, meaningful class names
- **Error Handling**: Use try/catch blocks for async operations
- **Image Processing**: Use workers for CPU-intensive operations

## Project Structure
- `/src/components/` - Vue components
- `/src/composables/` - Reusable composition functions
- `/src/utils/` - Utility functions
- `/src/workers/` - Web Worker scripts
- `/src/assets/` - Static assets (CSS, images)