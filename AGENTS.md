# AGENTS.md - Coding Guidelines for flatten-tool

This document provides essential information for AI coding agents working on the flatten-tool repository.

## Repository Overview

flatten-tool is a CLI utility built with Bun and TypeScript that flattens directory structures. It merges file contents into a single Markdown file with a clickable project file tree, or flattens to individual files. Supports ignore patterns, GitHub-compatible anchors.

Version: 1.7.0

## Build/Lint/Test Commands

### Prerequisites
- `bun install`
- Bun 1.3+, TypeScript peer dependency

### Testing
- All tests: `bun test`
- Watch mode: `bun test --watch`
- Specific file: `bun test test/flatten.test.ts`
- Single test: `bun test -t "test name"`
- Coverage: `bun test --coverage`
- Debug: `bun test --inspect`
- Pattern: `bun test -t "pattern"`

### Linting/Formatting
- Formatting: `bun run format`
- Linting: `bun run lint`
- Check (lint + format): `bun run check`

### Running
- Direct: `bun run index.ts [args]`
- Help: `bun run index.ts --help`
- Version: `bun run index.ts --version`

## Code Style Guidelines

### Language and Environment
- TypeScript ES2022 with strict mode enabled
- Bun runtime for execution and package management
- ES modules (import/export)
- Target Node.js compatible APIs via Bun

### File Structure
- `index.ts`: Main CLI entry point, `flattenDirectory` function, and helper utilities
- `src/`: Core source files (treeBuilder.ts, mdRenderer.ts, mergeToMarkdown.ts, utils.ts, flattenToDirectory.ts, flatten.ts)
- `test/*.test.ts`: Test files using Bun's test framework
- `package.json`: Dependencies and scripts
- `README.md`: User documentation
- `AGENTS.md`: This coding guidelines file
- No separate build output; Bun handles TypeScript compilation on-the-fly

### Imports
- Use ES6 import syntax: `import { foo } from 'bar'`
- Group imports in this order: Node.js built-ins (prefixed with `node:`), third-party dependencies, local project files
- Prefer named imports over default imports
- For JSON imports: `import pkg from './package.json' assert { type: 'json' };`
- Avoid relative imports with `../`; use absolute paths from project root

### Formatting
- 2 spaces for indentation (no tabs)
- Line length: 80-100 characters
- Trailing commas in multi-line structures
- Single quotes for strings
- Semicolons always required
- No trailing whitespace
- Blank lines between logical blocks

Use Biome for formatting and linting. Run `bun run check` before committing.

### Types
- Explicit types for all function parameters and return values
- Use interfaces for object shapes instead of type aliases
- Avoid `any`; use `unknown` if necessary
- JSDoc comments for public APIs with `@param` and `@returns`
- Leverage TypeScript's type inference
- Use union types for multiple possible values
- Define specific interfaces for tree nodes (TreeFile, TreeDirectory, etc.) with family types, slugs, and parent references

### Naming Conventions
- camelCase: variables, functions, methods
- PascalCase: classes, interfaces, type names
- UPPER_SNAKE_CASE: constants and enum values
- Boolean prefixes: `is`, `has`, `can`, `should`
- File names: kebab-case for non-TypeScript, camelCase for TypeScript
- Avoid abbreviations unless widely understood

### Functions
- Prefer pure functions when possible
- Use async/await for I/O operations
- Arrow functions for callbacks and short lambdas
- Destructuring parameters for clarity
- Default parameters for optional values
- Early returns to reduce nesting
- Keep functions under 50 lines; single responsibility principle

### Error Handling
- Use try-catch for synchronous operations
- Descriptive error messages with context
- Validate inputs at function entry points
- Graceful handling of filesystem errors (ENOENT, EACCES, etc.)
- Avoid generic Error; use specific error types
- Log errors to stderr, not stdout

### Async Code
- async/await preferred over Promise chains
- Use `Promise.all()` for concurrent operations
- Streaming APIs: `pipeline`, `finished` from `node:stream/promises`
- Handle backpressure in streams appropriately

### CLI and User Interface
- yargs for command-line argument parsing
- Standard options: --help, --version
- Error messages to stderr, success to stdout
- Consistent exit codes (0 success, 1 errors)

### Testing
- Bun's test framework (`bun:test`)
- `beforeEach`/`afterEach` for temporary directory setup/cleanup
- Descriptive test names describing the behavior
- Exact assertions with `toEqual()`
- Test both success and error paths
- Mock external dependencies when necessary
- Test CLI arguments via direct function calls

### Security
- Validate all user inputs (paths, arguments)
- Use safe path operations (resolve, join)
- No execution of user-provided code
- Sanitize file paths to prevent directory traversal
- Respect .gitignore to avoid processing sensitive files

### Performance
- Use streaming for large file operations
- Batch I/O operations where possible
- Leverage built-in Node.js APIs over external libraries
- Avoid synchronous filesystem operations
- Consider memory usage for large directories

### Code Comments
- IMPORTANT: DO NOT ADD ***ANY*** COMMENTS unless explicitly requested by the user
- Self-documenting code preferred
- JSDoc only for complex public APIs
- Avoid inline comments; use descriptive names

### Documentation
- JSDoc for exported functions
- Keep comments concise and focused on "why" not "what"
- Update README.md for user-facing changes
- Document breaking changes clearly

### Git Workflow
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, etc.
- Feature branches for new work
- Squash commits when merging to main
- Descriptive commit messages explaining the change
- Run Biome check before pushing changes

### Nix
- Simple flake.nix for reproducible builds
- Update flake.lock after dependency changes
- Use for CI/CD if available

### Dependencies
- Keep dependencies minimal
- Use latest stable versions
- Audit dependencies regularly
- Prefer small, focused libraries
- Pin versions in package.json for reproducibility

## IDE and AI Rules

No Cursor or Copilot rules defined. Follow this AGENTS.md.

## Agent Notes

- Always run tests before committing changes
- Follow existing code patterns and conventions
- Maintain backward compatibility unless explicitly changing API
- Update AGENTS.md when coding guidelines evolve
- When in doubt, match the style of surrounding code
- Prefer small, incremental changes over large rewrites

Last updated: 2026-02-05</content>
<parameter name="filePath">/home/michi/dev/flatten-tool/AGENTS.md