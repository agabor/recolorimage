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

## Required Reading

Before solving any issues or implementing features, Claude should:

1. **Read the README.md file completely** to understand:
   - Project purpose and architecture
   - Installation and setup instructions
   - Coding standards and conventions
   - Testing requirements

2. Consider the project's overall architecture and design patterns when implementing solutions.

3. Follow the established code style and conventions of the project.

## Issue Resolution Guidelines

When resolving issues:

1. Always start by reading the README.md to understand the context of the project.
2. Review the issue description thoroughly.
3. Determine if the issue requires README.md updates:
   - For feature additions or API changes, README.md updates are required
   - For bug fixes or minor changes, README.md updates may not be necessary
4. Run linting tools before creating pull requests.
5. Write tests for new features or bug fixes when applicable.

## Pull Request Requirements

All pull requests should:

1. Reference the issue number
2. Include a clear description of changes made
3. Mention whether README.md was updated and why/why not
4. Pass all linting checks
5. Include relevant tests (if applicable)

## Example Issue Resolution Process

1. Read README.md for project context
2. Analyze the issue
3. Implement solution following project conventions
4. Update documentation if needed
5. Run linters and fix any issues
6. Create pull request with appropriate details

## Additional Notes

- The project uses npm for package management
- Code quality is enforced through linting rules
- Documentation is considered as important as code

Thank you for using these guidelines when working with our codebase.