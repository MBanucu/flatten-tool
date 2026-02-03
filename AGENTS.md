# AGENTS.md - Coding Guidelines for flatten-tool

This document provides essential information for AI coding agents (like opencode) working on the flatten-tool repository. It includes build/test commands, code style guidelines, and best practices to maintain consistency and quality.

## Repository Overview

flatten-tool is a CLI utility built with Bun and TypeScript that flattens directory structures by copying or moving files to a single directory with escaped path components in filenames. It supports ignore patterns and is designed for reproducibility.

## Build/Lint/Test Commands

### Prerequisites
- Install dependencies: `bun install`
- Ensure Bun is installed (version 1.3+ recommended)

### Testing
- Run all tests: `bun test`
- Run tests in watch mode: `bun test --watch`
- Run a specific test file: `bun test test/flatten.test.ts`
- Run a single test by name: `bun test -t "flattens a simple nested directory"`
- Run tests with coverage: `bun test --coverage` (if configured)
- Debug tests: `bun test --inspect`

### Building
- No explicit build step required for development (Bun handles TypeScript directly)
- For production binary: `bun build ./index.ts --compile --outfile flatten-tool`
- Check TypeScript compilation: `bun run tsc --noEmit` (if TypeScript is configured)

### Linting and Formatting
- Format code: `bun run prettier --write .` (if Prettier is configured)
- Lint code: `bun run eslint .` (if ESLint is configured)
- Type checking: `bun run tsc` or `bun run tsc --noEmit`

### Nix Flake
- Build Nix package: `nix build .`
- Run Nix app: `nix run . -- <args>`
- Install globally: `nix profile install .`

### CI/CD
- Run full CI locally: `bun test && nix build .`
- Check for linting issues before commit

## Code Style Guidelines

### Language and Framework
- **Primary Language**: TypeScript with ES2022 features
- **Runtime**: Bun (not Node.js)
- **Module System**: ES modules (`import`/`export`)
- **Package Manager**: Bun (use `bun.lock` for lockfile)

### File Structure
- `index.ts`: Main CLI entry point
- `test/`: Test files with `.test.ts` extension
- `flake.nix`: Nix package definition
- `bun-packages.nix`: Bun dependency expressions (generated)
- `.gitignore`: Standard ignores including `node_modules`, `result`, etc.

### Imports and Dependencies
- Use ES6 imports: `import { foo } from 'bar'`
- Group imports: standard library, third-party, local
- Avoid relative imports for non-local files
- Prefer named imports over default imports
- Use Bun's built-in modules when possible (e.g., `node:fs/promises`)

### Formatting
- Use consistent indentation (2 spaces)
- Line length: 80-100 characters
- Trailing commas in objects/arrays
- Single quotes for strings, double for JSX (if any)
- Semicolons: always
- Use Prettier for auto-formatting if configured

### Types and TypeScript
- Strict mode: enabled (`"strict": true` in tsconfig.json)
- Use explicit types for function parameters and return values
- Prefer interfaces over types for object shapes
- Use union types for variants
- Avoid `any`; use `unknown` if necessary
- Generic types for reusable components
- Type assertions only when necessary (prefer type guards)

### Naming Conventions
- **Variables/Functions**: camelCase (`flattenDirectory`, `escapePathComponent`)
- **Classes/Types/Interfaces**: PascalCase (`FlattenOptions`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_IGNORE_PATTERNS`)
- **Files**: kebab-case or camelCase (`index.ts`, `flatten.test.ts`)
- **Private members**: prefix with `_` (e.g., `_privateMethod`)
- **Booleans**: prefix with `is`, `has`, `can` (e.g., `isDirectory`, `hasFiles`)

### Functions and Methods
- Pure functions preferred when possible
- Async functions for I/O operations
- Use arrow functions for callbacks and short functions
- Parameter destructuring for options objects
- Default parameters for optional values
- Early returns to reduce nesting

### Error Handling
- Use try-catch for synchronous errors
- Async functions should handle rejections (Bun handles uncaught rejections)
- Throw custom Error subclasses for specific error types
- Log errors to stderr with descriptive messages
- Exit with appropriate codes (0 for success, 1 for errors)
- Validate inputs early

### Asynchronous Code
- Use `async`/`await` over Promises when possible
- Handle concurrent operations with `Promise.all`
- Use `for await` for async iterators
- Avoid callback hell; prefer async patterns

### CLI and User Interaction
- Use yargs for CLI parsing
- Provide helpful `--help` output
- Support `--version` flag
- Use stderr for errors, stdout for normal output
- Exit codes: 0 success, 1 error
- Progress indicators for long operations

### Testing
- Use Bun's test framework
- Test files: `*.test.ts` in `test/` directory
- Describe blocks for test suites
- It blocks for individual tests
- Use `beforeEach`/`afterEach` for setup/teardown
- Mock external dependencies when necessary
- Test both success and error cases
- Aim for high coverage of critical paths

### Security
- Validate all user inputs
- Use safe path operations (avoid `..` in paths)
- Sanitize file paths to prevent directory traversal
- Handle symlinks appropriately
- No execution of user-provided code

### Performance
- Use streaming for large file operations
- Batch I/O operations when possible
- Avoid unnecessary allocations
- Profile with Bun's built-in tools if needed

### Documentation
- JSDoc comments for public APIs
- Inline comments for complex logic
- README.md for usage instructions
- This AGENTS.md for development guidelines

### Git Workflow
- Conventional commits: `feat:`, `fix:`, `chore:`, etc.
- Branch naming: `feature/`, `bugfix/`, `refactor/`
- Pull requests with descriptions
- Squash merges for clean history

### Nix Integration
- Keep flake.nix simple and declarative
- Update flake.lock after input changes
- Test builds with `nix build .`
- Ensure reproducibility across systems

### Best Practices
- Write self-documenting code
- Keep functions small and focused
- Use meaningful variable names
- Avoid magic numbers/strings
- Handle edge cases gracefully
- Test-driven development for new features
- Code review before merging

## Agent-Specific Notes

### opencode (this agent)
- Prefers concise, direct responses
- Uses tools for file operations, searches, and commands
- Follows the guidelines above strictly
- Commits changes with conventional commit messages
- Pushes to remote after local commits

### General AI Agent Guidelines
- Always run tests before committing
- Check for linting errors
- Follow the existing code patterns
- Ask for clarification if requirements are unclear
- Maintain backwards compatibility
- Document breaking changes

## Maintenance

Update this file when:
- New tools or commands are added
- Code style evolves
- New team members join
- Major refactors change patterns

Last updated: 2026-02-03