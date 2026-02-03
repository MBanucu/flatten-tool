# AGENTS.md - Coding Guidelines for flatten-tool

This document provides essential information for AI coding agents (like opencode) working on the flatten-tool repository. It includes build/test commands, code style guidelines, and best practices to maintain consistency and quality.

## Repository Overview

flatten-tool is a CLI utility built with Bun and TypeScript that flattens directory structures by copying or moving files to a single directory with escaped path components in filenames. It supports ignore patterns via .gitignore files and command-line options, designed for reproducibility. Key features include handling nested directories, respecting git ignore rules, automatic .git exclusion, optional file overwriting or gitignore disabling, and merging file contents into a single Markdown file with special handling for markdown sources. By default, it merges all file contents into a single Markdown file; use `--directory` to flatten to individual files instead.

Version: 1.2.2

## Build/Lint/Test Commands

### Prerequisites
- Install dependencies: `bun install`
- Ensure Bun is installed (version 1.3+ recommended)
- TypeScript is a peer dependency (install globally or via Nix)

### Testing
- Run all tests: `bun test`
- Run tests in watch mode: `bun test --watch`
- Run a specific test file: `bun test test/flatten.test.ts`
- Run a single test by name: `bun test -t "flattens a simple nested directory"`
- Run tests with coverage: `bun test --coverage` (if configured)
- Debug tests: `bun test --inspect`
- Run tests matching a pattern: `bun test -t "handles filename"`

### Building
- No explicit build step required for development (Bun handles TypeScript directly)
- For production binary: `bun build ./index.ts --compile --outfile flatten-tool`
- For Nix package: `nix build` (copies source files and creates wrapper)
- Type checking: No tsconfig.json configured; Bun handles TypeScript compilation

### Linting and Formatting
- No ESLint or Prettier configured in this repository
- Format code manually following the guidelines below

### Nix Flake
- Build Nix package: `nix build .`
- Run Nix app: `nix run . -- <args>`
- Install globally: `nix profile install .`

### Running the CLI
- Run the tool directly: `bun run index.ts [args]`
- Test CLI help: `bun run index.ts --help`
- Test version: `bun run index.ts --version`

## Code Style Guidelines

### Language and Framework
- **Primary Language**: TypeScript with ES2022 features
- **Runtime**: Bun (not Node.js)
- **Module System**: ES modules (`import`/`export`)
- **Package Manager**: Bun (use `bun.lock` for lockfile)

### File Structure
- `index.ts`: Main CLI entry point with yargs CLI parsing and flattenDirectory function
- `test/`: Test files with `.test.ts` extension
- `AGENTS.md`: Coding guidelines for AI agents (this file)
- `flake.nix`: Nix package definition
- `package.json`: Project metadata with Bun dependencies
- `README.md`: Usage instructions and examples
- `.gitignore`: Standard ignores including `node_modules`, `result`, etc.

### Imports and Dependencies
- Use ES6 imports: `import { foo } from 'bar'`
- Group imports: standard library (node:*), third-party, local
- Avoid relative imports for non-local files
- Prefer named imports over default imports
- Use Bun's built-in modules (e.g., `node:fs/promises`, `node:fs` for streams, `node:stream/promises` for pipeline utilities)
- Import JSON files with `assert { type: 'json' }` for configuration: `import pkg from './package.json' assert { type: 'json' };`
- Key dependencies: `globby` for file globbing, `yargs` for CLI parsing, `ignore` for gitignore support, `minimatch` for pattern matching

### Formatting
- Use consistent indentation (2 spaces)
- Line length: 80-100 characters
- Trailing commas in objects/arrays
- Single quotes for strings
- Semicolons: always
- No trailing whitespace
- One blank line between functions and blocks

### Types and TypeScript
- Use explicit types for function parameters and return values
- Prefer interfaces over types for object shapes
- Use union types for variants
- Avoid `any`; use `unknown` if necessary
- Type assertions only when necessary (prefer type guards)
- Use `const` assertions for readonly arrays/objects
- Leverage Bun's type definitions

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
- Keep functions focused and under 50 lines

### Error Handling
- Use try-catch for synchronous errors
- Async functions handle rejections (Bun handles uncaught rejections)
- Throw descriptive Error messages
- Validate inputs early
- Exit with appropriate codes (0 success, 1 error)
- Handle file system errors gracefully (e.g., ENOENT)

### Asynchronous Code
- Use `async`/`await` over Promises when possible
- Handle concurrent operations with `Promise.all` where appropriate
- Use `for await` for async iterators
- Avoid mixing promises and callbacks
- Use `pipeline` and `finished` from `node:stream/promises` for efficient streaming I/O operations

### CLI and User Interaction
- Use yargs for CLI parsing
- Provide helpful `--help` output
- Support `--version` flag (dynamically read from package.json)
- Use stderr for errors, stdout for normal output
- Progress indicators for long operations if needed
- Validate CLI arguments and provide clear error messages

### Testing
- Use Bun's test framework
- Test files: `*.test.ts` in `test/` directory
- Use `beforeEach`/`afterEach` for setup/teardown (e.g., create temp directories)
- Test both success and error cases
- Aim for high coverage of critical paths
- Use descriptive test names and expect statements for clarity
- Mock external dependencies when necessary
- When adding new tests, follow the pattern of creating temp directories in beforeEach/afterEach using `mkdtemp(join(tmpdir(), 'test-prefix-'))`
- Test CLI behavior by running `bun run index.ts` with various arguments
- Test error conditions with `expect(...).rejects.toThrow()`
- Use specific test names for targeted runs

### Security
- Validate all user inputs
- Use safe path operations (avoid `..` in paths)
- Sanitize file paths to prevent directory traversal
- No execution of user-provided code
- Avoid logging sensitive information

### Performance
- Use streaming for large file operations (as implemented in Markdown merging with `pipeline` and `finished`)
- Batch I/O operations when possible
- Avoid unnecessary allocations
- Prefer built-in Bun/Node APIs for performance

### Documentation
- JSDoc comments for public APIs
- Inline comments for complex logic
- README.md for usage instructions
- Keep comments concise and explanatory

### Git Workflow
- Conventional commits: `feat:`, `fix:`, `chore:`, etc.
- Branch naming: `feature/`, `bugfix/`, `refactor/`
- Pull requests with descriptions
- Squash commits when appropriate

### Nix Integration
- Keep flake.nix simple and declarative
- Update flake.lock after input changes
- Ensure reproducibility across systems

### Best Practices
- Write self-documenting code
- Keep functions small and focused
- Avoid magic numbers/strings
- Handle edge cases gracefully
- Test-driven development for new features
- Always follow security best practices. Never introduce code that exposes or logs secrets and keys. Never commit secrets or keys to the repository.
- Use streaming APIs for large data processing
- Prefer async/await for clarity

## IDE and AI Assistant Rules

No Cursor rules (.cursor/rules/ or .cursorrules) or Copilot instructions (.github/copilot-instructions.md) are defined in this repository. Agents should follow the guidelines in this AGENTS.md file.

## Agent-Specific Notes

### opencode (this agent)
- Prefers concise, direct responses
- Uses tools for file operations, searches, and commands
- Follows the guidelines above strictly
- Commits changes with conventional commit messages
- Pushes to remote after local commits

### General AI Agent Guidelines
- Always run tests before committing
- Follow the existing code patterns
- Ask for clarification if requirements are unclear
- Maintain backwards compatibility
- Document breaking changes
- Update AGENTS.md when patterns change

## Maintenance

Update this file when:
- New tools or commands are added
- Code style evolves
- New team members join
- Major refactors change patterns
- Build system changes (e.g., Nix flake updates)
- Dependencies are added/removed

Last updated: 2026-02-04</content>
<parameter name="filePath">/home/michi/dev/flatten-tool/AGENTS.md