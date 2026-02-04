# AGENTS.md - Coding Guidelines for flatten-tool

This document provides essential information for AI coding agents working on the flatten-tool repository.

## Repository Overview

flatten-tool is a CLI utility built with Bun and TypeScript that flattens directory structures. It merges file contents into a single Markdown file with a clickable project file tree, or flattens to individual files. Supports ignore patterns, GitHub-compatible anchors.

Version: 1.6.3

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

### Building
- Development: No build needed (Bun handles TS)
- Production binary: `bun build ./index.ts --compile --outfile flatten-tool`
- Nix: `nix build`

### Running
- Direct: `bun run index.ts [args]`
- Help: `bun run index.ts --help`
- Version: `bun run index.ts --version`

## Code Style Guidelines

### Language
- TypeScript ES2022, Bun runtime, ES modules, Bun package manager

### File Structure
- `index.ts`: CLI entry, flattenDirectory, helpers
- `test/*.test.ts`: Bun test framework
- `package.json`, `README.md`, etc.

### Imports
- ES6 imports: `import { foo } from 'bar'`
- Group: node:*, third-party, local
- Named imports preferred
- JSON: `import pkg from './package.json' assert { type: 'json' };`

### Formatting
- 2 spaces indentation
- 80-100 char lines
- Trailing commas
- Single quotes
- Semicolons always
- No trailing whitespace
- Blank lines between blocks

### Types
- Explicit types for params/returns
- Interfaces over types
- Avoid `any`
- JSDoc for public APIs

### Naming
- camelCase: variables/functions
- PascalCase: classes/interfaces
- UPPER_SNAKE: constants
- Booleans: `is`, `has`, `can`

### Functions
- Pure when possible
- Async for I/O
- Arrow for callbacks
- Destructuring
- Default params
- Early returns
- <50 lines

### Error Handling
- try-catch for sync
- Descriptive errors
- Validate inputs
- Graceful FS errors

### Async Code
- async/await preferred
- Promise.all for concurrent
- Streaming: `pipeline`, `finished`

### CLI
- yargs parsing
- --help, --version
- stderr for errors

### Testing
- Bun framework
- beforeEach/afterEach for temp dirs
- Descriptive names
- Exact matches for assertions
- Test CLI args
- Error conditions

### Security
- Validate inputs
- Safe paths
- No user code execution

### Performance
- Streaming for large files
- Batch I/O
- Built-in APIs

### Documentation
- JSDoc
- Concise comments

### Git
- Conventional commits
- Feature branches

### Nix
- Simple flake
- Update lock

### Best Practices
- Self-documenting code
- Small functions
- TDD
- Security first

## IDE and AI Rules

No Cursor or Copilot rules defined. Follow this AGENTS.md.

## Agent Notes

- Run tests before commit
- Follow patterns
- Maintain compatibility
- Update AGENTS.md on changes

Last updated: 2026-02-04</content>
<parameter name="filePath">/home/michi/dev/flatten-tool/AGENTS.md