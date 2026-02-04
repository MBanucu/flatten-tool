<a id="project-file-tree"></a>
# Project File Tree

- [test/](#test)
  - [flatten.test.ts](#testflattentestts)
- [.biomeignore](#biomeignore)
- [.envrc](#envrc)
- [.gitignore](#gitignore)
- [AGENTS.md](#agentsmd)
- [biome_integration_report.md](#biome_integration_reportmd)
- [biome.json](#biomejson)
- [bun.lock](#bunlock)
- [flake.lock](#flakelock)
- [flake.nix](#flakenix)
- [index.ts](#indexts)
- [LICENSE](#license)
- [package.json](#packagejson)
- [README.md](#readmemd)


<a id="test"></a>
# test

File Tree

- [..](#project-file-tree)
- [flatten.test.ts](#testflattentestts)

<a id="testflattentestts"></a>
# test/flatten.test.ts

```ts
import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { flattenDirectory } from '../index.ts';

let tempDir;
let sourceDir;
let targetDir;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'flatten-test-'));
  sourceDir = join(tempDir, 'source');
  targetDir = join(tempDir, 'target');
  await mkdir(sourceDir, { recursive: true });
  await mkdir(targetDir, { recursive: true });
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

test('flattens a simple nested directory', async () => {
  // Create nested structure
  await mkdir(join(sourceDir, 'subdir'));
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'subdir', 'file2.txt'), 'content2');

  await flattenDirectory(sourceDir, targetDir, true, false, [], true, true); // move

  // Check target has both files with path-based names
  const targetFiles = await readdir(targetDir);
  expect(targetFiles.sort()).toEqual(['file1.txt', 'subdir_file2.txt']);

  // Check source subdir is removed
  try {
    await stat(join(sourceDir, 'subdir'));
    expect(false).toBe(true); // Should not exist
  } catch (e) {
    expect(e.code).toBe('ENOENT');
  }

  // Check source has only file1.txt (but wait, file1.txt was moved)
  const sourceFiles = await readdir(sourceDir);
  expect(sourceFiles).toEqual([]); // file1.txt moved, subdir removed
});

test('handles filename conflicts', async () => {
  await mkdir(join(sourceDir, 'subdir'));
  await writeFile(join(sourceDir, 'file.txt'), 'content1');
  await writeFile(join(sourceDir, 'subdir', 'file.txt'), 'content2');

  await flattenDirectory(sourceDir, targetDir, true, false, [], true, true); // move

  const targetFiles = await readdir(targetDir);
  expect(targetFiles.sort()).toEqual(['file.txt', 'subdir_file.txt']);
});

test('copies files by default', async () => {
  await mkdir(join(sourceDir, 'subdir'));
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'subdir', 'file2.txt'), 'content2');

  await flattenDirectory(sourceDir, targetDir, false, false, [], true, true); // copy

  // Check target has copies
  const targetFiles = await readdir(targetDir);
  expect(targetFiles.sort()).toEqual(['file1.txt', 'subdir_file2.txt']);

  // Check source still has originals
  const sourceFiles = await readdir(sourceDir);
  expect(sourceFiles.sort()).toEqual(['file1.txt', 'subdir']);

  const subFiles = await readdir(join(sourceDir, 'subdir'));
  expect(subFiles).toEqual(['file2.txt']);
});

test('ignores files matching patterns', async () => {
  await mkdir(join(sourceDir, 'subdir'));
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'subdir', 'file2.txt'), 'content2');
  await writeFile(join(sourceDir, 'ignore.txt'), 'ignored');

  await flattenDirectory(sourceDir, targetDir, true, false, ['ignore.txt'], true, true); // move, ignore specific file

  const targetFiles = await readdir(targetDir);
  expect(targetFiles.sort()).toEqual(['file1.txt', 'subdir_file2.txt']); // ignore.txt ignored

  // Check source still has the ignored file, subdir removed since empty
  const sourceFiles = await readdir(sourceDir);
  expect(sourceFiles).toEqual(['ignore.txt']);
});

test('ignores files from .gitignore by default', async () => {
  await mkdir(join(sourceDir, 'subdir'));
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'subdir', 'file2.txt'), 'content2');
  await writeFile(join(sourceDir, 'ignore.txt'), 'ignored');
  await writeFile(join(sourceDir, '.gitignore'), 'ignore.txt\n# comment\n\n*.log\n');

  await flattenDirectory(sourceDir, targetDir, true, false, [], true, true); // move, should ignore from .gitignore

  const targetFiles = await readdir(targetDir);
  expect(targetFiles.sort()).toEqual(['.gitignore', 'file1.txt', 'subdir_file2.txt']); // ignore.txt ignored, .gitignore included

  // Check source still has the ignored file, subdir removed since empty
  const sourceFiles = await readdir(sourceDir);
  expect(sourceFiles).toEqual(['ignore.txt']);
});

test('ignores files from .gitignore in subdirectories', async () => {
  await mkdir(join(sourceDir, 'subdir'));
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'subdir', 'file2.txt'), 'content2');
  await writeFile(join(sourceDir, 'subdir', 'ignore_in_sub.txt'), 'ignored in sub');
  await writeFile(join(sourceDir, 'subdir', '.gitignore'), 'ignore_in_sub.txt\n');

  await flattenDirectory(sourceDir, targetDir, true, false, [], true, true); // move

  const targetFiles = await readdir(targetDir);
  expect(targetFiles.sort()).toEqual(['file1.txt', 'subdir_.gitignore', 'subdir_file2.txt']); // ignore_in_sub.txt ignored

  // Check source subdir still has the ignored file
  const sourceFiles = await readdir(sourceDir);
  expect(sourceFiles).toEqual(['subdir']);
  const subFiles = await readdir(join(sourceDir, 'subdir'));
  expect(subFiles).toEqual(['ignore_in_sub.txt']);
});

test('escapes underscores in path components', async () => {
  await mkdir(join(sourceDir, 'sub_dir'));
  await writeFile(join(sourceDir, 'file_1.txt'), 'content1');
  await writeFile(join(sourceDir, 'sub_dir', 'file_2.txt'), 'content2');

  await flattenDirectory(sourceDir, targetDir, true, false, [], true, true); // move

  const targetFiles = await readdir(targetDir);
  expect(targetFiles.sort()).toEqual(['file__1.txt', 'sub__dir_file__2.txt']);
});

test('does not ignore files from .gitignore when respectGitignore=false', async () => {
  await mkdir(join(sourceDir, 'subdir'));
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'subdir', 'file2.txt'), 'content2');
  await writeFile(join(sourceDir, 'ignore.txt'), 'ignored');
  await writeFile(join(sourceDir, '.gitignore'), 'ignore.txt\n');

  await flattenDirectory(sourceDir, targetDir, true, false, [], false, true); // respectGitignore = false

  const targetFiles = await readdir(targetDir);
  expect(targetFiles.sort()).toEqual(['.gitignore', 'file1.txt', 'ignore.txt', 'subdir_file2.txt']);
});

test('merges files into a single md file', async () => {
  await mkdir(join(sourceDir, 'subdir'));
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'subdir', 'file2.js'), 'content2');

  const mdTarget = join(tempDir, 'output.md');
  await flattenDirectory(sourceDir, mdTarget, false, false, [], true, false); // copy, mergeMd

  const mdContent = await readFile(mdTarget, 'utf8');
  expect(mdContent).toContain('# file1.txt\n\n```txt\ncontent1\n```');
  expect(mdContent).toContain('# subdir/file2.js\n\n```js\ncontent2\n```');

  // Source files still exist since copy
  expect(await readdir(sourceDir)).toContain('file1.txt');
});

test('merges files into md with move', async () => {
  await mkdir(join(sourceDir, 'subdir'));
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'subdir', 'file2.js'), 'content2');

  const mdTarget = join(tempDir, 'output.md');
  await flattenDirectory(sourceDir, mdTarget, true, false, [], true, false); // move, mergeMd

  const mdContent = await readFile(mdTarget, 'utf8');
  expect(mdContent).toContain('# file1.txt\n\n```txt\ncontent1\n```');
  expect(mdContent).toContain('# subdir/file2.js\n\n```js\ncontent2\n```');

  // Source files deleted, subdir empty and removed
  const sourceFiles = await readdir(sourceDir);
  expect(sourceFiles).toEqual([]);
});

test('handles md target conflict without overwrite', async () => {
  await writeFile(join(sourceDir, 'file.txt'), 'content');
  const mdTarget = join(tempDir, 'output.md');
  await writeFile(mdTarget, 'existing');

  await expect(
    flattenDirectory(sourceDir, mdTarget, false, false, [], true, false)
  ).rejects.toThrow(/already exists/);
});

test('overwrites md target with overwrite', async () => {
  await writeFile(join(sourceDir, 'file.txt'), 'new content');
  const mdTarget = join(tempDir, 'output.md');
  await writeFile(mdTarget, 'existing');

  await flattenDirectory(sourceDir, mdTarget, false, true, [], true, false); // overwrite

  const mdContent = await readFile(mdTarget, 'utf8');
  expect(mdContent).toContain('new content');
  expect(mdContent).not.toContain('existing');
});

test('ignores files when merging to md', async () => {
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'ignore.txt'), 'ignored');
  await writeFile(join(sourceDir, '.gitignore'), 'ignore.txt');

  const mdTarget = join(tempDir, 'output.md');
  await flattenDirectory(sourceDir, mdTarget, false, false, [], true, false);

  const mdContent = await readFile(mdTarget, 'utf8');
  expect(mdContent).toContain('# file1.txt');
  expect(mdContent).toContain('# .gitignore');
});

test('excludes gif files by default when merging to md', async () => {
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'image.gif'), 'fake gif content');

  const mdTarget = join(tempDir, 'output.md');
  await flattenDirectory(sourceDir, mdTarget, false, false, [], true, false); // merge to md

  const mdContent = await readFile(mdTarget, 'utf8');
  expect(mdContent).toContain('# file1.txt');
  expect(mdContent).not.toContain('## image.gif');
  expect(mdContent).not.toContain('fake gif content');
});

test('includes gif files when flattening to directory', async () => {
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'image.gif'), 'fake gif content');

  await flattenDirectory(sourceDir, targetDir, false, false, [], true, true); // flatten to directory

  const targetFiles = await readdir(targetDir);
  expect(targetFiles.sort()).toEqual(['file1.txt', 'image.gif']);
});

test('excludes gif files in subdirs by default when merging to md', async () => {
  await mkdir(join(sourceDir, 'subdir'));
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'subdir', 'file2.js'), 'content2');
  await writeFile(join(sourceDir, 'subdir', 'image.gif'), 'fake gif content');

  const mdTarget = join(tempDir, 'output.md');
  await flattenDirectory(sourceDir, mdTarget, false, false, [], true, false); // merge to md

  const mdContent = await readFile(mdTarget, 'utf8');
  expect(mdContent).toContain('# file1.txt');
  expect(mdContent).toContain('# subdir/file2.js');
  expect(mdContent).not.toContain('## subdir/image.gif');
  expect(mdContent).not.toContain('fake gif content');
});

```

<a id="biomeignore"></a>
# .biomeignore

```text
node_modules
dist
out
coverage
```

<a id="envrc"></a>
# .envrc

```text
use flake
```

<a id="gitignore"></a>
# .gitignore

```text
# dependencies (bun install)
node_modules

# output
out
dist
*.tgz
result

# code coverage
coverage
*.lcov

# logs
logs
_.log
report.[0-9]_.[0-9]_.[0-9]_.[0-9]_.json

# dotenv environment variable files
.env
.env.development.local
.env.test.local
.env.production.local
.env.local

# caches
.eslintcache
.cache
*.tsbuildinfo

# IntelliJ based IDEs
.idea

# Finder (MacOS) folder config
.DS_Store

# direnv
.direnv

```

<a id="agentsmd"></a>
# AGENTS.md

````md
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
- `test/*.test.ts`: Test files using Bun's test framework
- `package.json`: Dependencies and scripts
- `README.md`: User documentation
- `AGENTS.md`: This coding guidelines file
- No separate build output; Bun handles TypeScript compilation on-the-fly

### Imports
- Use ES6 import syntax: `import { foo } from 'bar'`
- Group imports in this order:
  1. Node.js built-ins (prefixed with `node:`)
  2. Third-party dependencies
  3. Local project files
- Prefer named imports over default imports when possible
- For JSON imports: `import pkg from './package.json' assert { type: 'json' };`
- Avoid relative imports with `../`; use absolute paths from project root if needed

Example:
```ts
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import yargs from 'yargs';
import GithubSlugger from 'github-slugger';
import { buildTreeObject } from './helpers.ts';
```

### Formatting
- 2 spaces for indentation (no tabs)
- Line length: 80-100 characters
- Trailing commas in multi-line structures
- Single quotes for strings
- Semicolons always required
- No trailing whitespace
- Blank lines between logical blocks of code
- Consistent spacing around operators and keywords

Use Biome for formatting and linting. Run `bun run check` before committing.

### Types
- Explicit types for all function parameters and return values
- Use interfaces for object shapes instead of type aliases
- Avoid `any` type; use `unknown` if truly necessary
- JSDoc comments for public APIs with `@param` and `@returns`
- Leverage TypeScript's type inference where possible
- Use union types for multiple possible values

Example:
```ts
interface FileEntry {
  srcPath: string;
  relPath: string;
}

function processFiles(files: FileEntry[]): string[] {
  return files.map(entry => entry.relPath);
}
```

### Naming Conventions
- camelCase: variables, functions, methods
- PascalCase: classes, interfaces, type names
- UPPER_SNAKE_CASE: constants and enum values
- Boolean prefixes: `is`, `has`, `can`, `should`
- File names: kebab-case for non-TypeScript files, camelCase for TypeScript files
- Avoid abbreviations unless widely understood

### Functions
- Prefer pure functions when possible
- Use async/await for I/O operations
- Arrow functions for callbacks and short lambdas
- Destructuring parameters for clarity
- Default parameters for optional values
- Early returns to reduce nesting
- Keep functions under 50 lines; break into smaller functions if needed
- Single responsibility principle

Example:
```ts
async function readAndProcessFile(filePath: string): Promise<string> {
  const content = await readFile(filePath, 'utf8');
  return content.trim().toUpperCase();
}
```

### Error Handling
- Use try-catch for synchronous operations
- Descriptive error messages with context
- Validate inputs at function entry points
- Graceful handling of filesystem errors (ENOENT, EACCES, etc.)
- Avoid throwing generic Error; use specific error types when appropriate
- Log errors to stderr, not stdout

### Async Code
- async/await preferred over Promise chains
- Use `Promise.all()` for concurrent operations
- Streaming APIs: `pipeline`, `finished` from `node:stream/promises`
- Handle backpressure in streams appropriately

### CLI and User Interface
- yargs for command-line argument parsing
- Standard options: --help, --version
- Error messages to stderr
- Success messages to stdout
- Consistent exit codes (0 for success, 1 for errors)

### Testing
- Bun's test framework (`bun:test`)
- `beforeEach`/`afterEach` for temporary directory setup/cleanup
- Descriptive test names describing the behavior
- Exact assertions with `toEqual()` rather than loose equality
- Test both success and error paths
- Mock external dependencies when necessary
- Test CLI arguments via direct function calls

Example test structure:
```ts
test('flattens directory with nested files', async () => {
  // Setup
  await mkdir(join(sourceDir, 'subdir'));
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');

  // Execute
  await flattenDirectory(sourceDir, targetFile, false, true, [], true, false);

  // Assert
  const content = await readFile(targetFile, 'utf8');
  expect(content).toContain('# file1.txt');
});
```

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
- Avoid inline comments; use descriptive variable/function names

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
- Run Biome check before pushing changes.

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

Last updated: 2026-02-04</content>
<parameter name="filePath">/home/michi/dev/flatten-tool/AGENTS.md
````

<a id="biome_integration_reportmd"></a>
# biome_integration_report.md

````md
# Biome Integration Report

## Configuration Issues
- Schema version was outdated (2.3.6 vs 2.3.13). Fixed with `biome migrate --write`.

## Parse Errors
- `import pkg from './package.json' assert { type: 'json' };` - Biome parser doesn't support import assertions yet, causing multiple "Expected semicolon" errors.

## Lint Errors (noExplicitAny)
- `buildTreeObject(relPaths: string[]): any` - Return type should be a proper tree structure interface.
- `const tree: any = {};` - Tree object type needed.
- `catch (err: any)` - Error type should be `unknown` or `Error`.
- `collectSections(node: any, ...)` - Node parameter needs tree type.
- `dirs: { name: string; child: any }[]` - Child should be recursive tree type.
- `Object.entries(node) as [string, any][]` - Entries need typed.
- `renderMarkdownTree(node: any, ...)` - Node type.
- `writeContentRecursive(node: any, ...)` - Node type.
- `const entries: [string, any][] = Object.entries(node);` - Typed entries.

## Other Lint Errors
- `noNonNullAssertion` on `anchorMap.get('')!` - Avoid non-null assertion.
- `noImplicitAnyLet` in test file: Variables `tempDir`, `sourceDir`, `targetDir` need type annotations or initialization.
- Style issues: Template literal preference, block statements, useless lone block.

## Suggestions
- Define interfaces for tree structures (e.g., `TreeNode` with recursive children).
- Replace `any` with `unknown` or proper types.
- For import assertions, consider using dynamic import or awaiting it if possible, or wait for Biome support.
- Initialize test variables with `string | undefined` or similar.
````

<a id="biomejson"></a>
# biome.json

```json
{
  "$schema": "https://biomejs.dev/schemas/2.3.13/schema.json",
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always",
      "trailingCommas": "es5"
    }
  },
  "files": {
    "includes": ["index.ts", "test/*.ts", "package.json", "biome.json"]
  }
}

```

<a id="bunlock"></a>
# bun.lock

```lock
{
  "lockfileVersion": 1,
  "configVersion": 1,
  "workspaces": {
    "": {
      "name": "flatten-tool",
      "dependencies": {
        "github-slugger": "^2.0.0",
        "globby": "^16.1.0",
        "ignore": "^7.0.5",
        "minimatch": "^10.1.2",
        "yargs": "^18.0.0",
      },
      "devDependencies": {
        "@biomejs/biome": "^2.3.14",
        "@types/bun": "latest",
        "@types/yargs": "^17.0.35",
      },
      "peerDependencies": {
        "typescript": "^5.9.3",
      },
    },
  },
  "packages": {
    "@biomejs/biome": ["@biomejs/biome@2.3.14", "", { "optionalDependencies": { "@biomejs/cli-darwin-arm64": "2.3.14", "@biomejs/cli-darwin-x64": "2.3.14", "@biomejs/cli-linux-arm64": "2.3.14", "@biomejs/cli-linux-arm64-musl": "2.3.14", "@biomejs/cli-linux-x64": "2.3.14", "@biomejs/cli-linux-x64-musl": "2.3.14", "@biomejs/cli-win32-arm64": "2.3.14", "@biomejs/cli-win32-x64": "2.3.14" }, "bin": { "biome": "bin/biome" } }, "sha512-QMT6QviX0WqXJCaiqVMiBUCr5WRQ1iFSjvOLoTk6auKukJMvnMzWucXpwZB0e8F00/1/BsS9DzcKgWH+CLqVuA=="],

    "@biomejs/cli-darwin-arm64": ["@biomejs/cli-darwin-arm64@2.3.14", "", { "os": "darwin", "cpu": "arm64" }, "sha512-UJGPpvWJMkLxSRtpCAKfKh41Q4JJXisvxZL8ChN1eNW3m/WlPFJ6EFDCE7YfUb4XS8ZFi3C1dFpxUJ0Ety5n+A=="],

    "@biomejs/cli-darwin-x64": ["@biomejs/cli-darwin-x64@2.3.14", "", { "os": "darwin", "cpu": "x64" }, "sha512-PNkLNQG6RLo8lG7QoWe/hhnMxJIt1tEimoXpGQjwS/dkdNiKBLPv4RpeQl8o3s1OKI3ZOR5XPiYtmbGGHAOnLA=="],

    "@biomejs/cli-linux-arm64": ["@biomejs/cli-linux-arm64@2.3.14", "", { "os": "linux", "cpu": "arm64" }, "sha512-KT67FKfzIw6DNnUNdYlBg+eU24Go3n75GWK6NwU4+yJmDYFe9i/MjiI+U/iEzKvo0g7G7MZqoyrhIYuND2w8QQ=="],

    "@biomejs/cli-linux-arm64-musl": ["@biomejs/cli-linux-arm64-musl@2.3.14", "", { "os": "linux", "cpu": "arm64" }, "sha512-LInRbXhYujtL3sH2TMCH/UBwJZsoGwfQjBrMfl84CD4hL/41C/EU5mldqf1yoFpsI0iPWuU83U+nB2TUUypWeg=="],

    "@biomejs/cli-linux-x64": ["@biomejs/cli-linux-x64@2.3.14", "", { "os": "linux", "cpu": "x64" }, "sha512-ZsZzQsl9U+wxFrGGS4f6UxREUlgHwmEfu1IrXlgNFrNnd5Th6lIJr8KmSzu/+meSa9f4rzFrbEW9LBBA6ScoMA=="],

    "@biomejs/cli-linux-x64-musl": ["@biomejs/cli-linux-x64-musl@2.3.14", "", { "os": "linux", "cpu": "x64" }, "sha512-KQU7EkbBBuHPW3/rAcoiVmhlPtDSGOGRPv9js7qJVpYTzjQmVR+C9Rfcz+ti8YCH+zT1J52tuBybtP4IodjxZQ=="],

    "@biomejs/cli-win32-arm64": ["@biomejs/cli-win32-arm64@2.3.14", "", { "os": "win32", "cpu": "arm64" }, "sha512-+IKYkj/pUBbnRf1G1+RlyA3LWiDgra1xpS7H2g4BuOzzRbRB+hmlw0yFsLprHhbbt7jUzbzAbAjK/Pn0FDnh1A=="],

    "@biomejs/cli-win32-x64": ["@biomejs/cli-win32-x64@2.3.14", "", { "os": "win32", "cpu": "x64" }, "sha512-oizCjdyQ3WJEswpb3Chdngeat56rIdSYK12JI3iI11Mt5T5EXcZ7WLuowzEaFPNJ3zmOQFliMN8QY1Pi+qsfdQ=="],

    "@isaacs/balanced-match": ["@isaacs/balanced-match@4.0.1", "", {}, "sha512-yzMTt9lEb8Gv7zRioUilSglI0c0smZ9k5D65677DLWLtWJaXIS3CqcGyUFByYKlnUj6TkjLVs54fBl6+TiGQDQ=="],

    "@isaacs/brace-expansion": ["@isaacs/brace-expansion@5.0.1", "", { "dependencies": { "@isaacs/balanced-match": "^4.0.1" } }, "sha512-WMz71T1JS624nWj2n2fnYAuPovhv7EUhk69R6i9dsVyzxt5eM3bjwvgk9L+APE1TRscGysAVMANkB0jh0LQZrQ=="],

    "@nodelib/fs.scandir": ["@nodelib/fs.scandir@2.1.5", "", { "dependencies": { "@nodelib/fs.stat": "2.0.5", "run-parallel": "^1.1.9" } }, "sha512-vq24Bq3ym5HEQm2NKCr3yXDwjc7vTsEThRDnkp2DK9p1uqLR+DHurm/NOTo0KG7HYHU7eppKZj3MyqYuMBf62g=="],

    "@nodelib/fs.stat": ["@nodelib/fs.stat@2.0.5", "", {}, "sha512-RkhPPp2zrqDAQA/2jNhnztcPAlv64XdhIp7a7454A5ovI7Bukxgt7MX7udwAu3zg1DcpPU0rz3VV1SeaqvY4+A=="],

    "@nodelib/fs.walk": ["@nodelib/fs.walk@1.2.8", "", { "dependencies": { "@nodelib/fs.scandir": "2.1.5", "fastq": "^1.6.0" } }, "sha512-oGB+UxlgWcgQkgwo8GcEGwemoTFt3FIO9ababBmaGwXIoBKZ+GTy0pP185beGg7Llih/NSHSV2XAs1lnznocSg=="],

    "@sindresorhus/merge-streams": ["@sindresorhus/merge-streams@4.0.0", "", {}, "sha512-tlqY9xq5ukxTUZBmoOp+m61cqwQD5pHJtFY3Mn8CA8ps6yghLH/Hw8UPdqg4OLmFW3IFlcXnQNmo/dh8HzXYIQ=="],

    "@types/bun": ["@types/bun@1.3.8", "", { "dependencies": { "bun-types": "1.3.8" } }, "sha512-3LvWJ2q5GerAXYxO2mffLTqOzEu5qnhEAlh48Vnu8WQfnmSwbgagjGZV6BoHKJztENYEDn6QmVd949W4uESRJA=="],

    "@types/node": ["@types/node@25.2.0", "", { "dependencies": { "undici-types": "~7.16.0" } }, "sha512-DZ8VwRFUNzuqJ5khrvwMXHmvPe+zGayJhr2CDNiKB1WBE1ST8Djl00D0IC4vvNmHMdj6DlbYRIaFE7WHjlDl5w=="],

    "@types/yargs": ["@types/yargs@17.0.35", "", { "dependencies": { "@types/yargs-parser": "*" } }, "sha512-qUHkeCyQFxMXg79wQfTtfndEC+N9ZZg76HJftDJp+qH2tV7Gj4OJi7l+PiWwJ+pWtW8GwSmqsDj/oymhrTWXjg=="],

    "@types/yargs-parser": ["@types/yargs-parser@21.0.3", "", {}, "sha512-I4q9QU9MQv4oEOz4tAHJtNz1cwuLxn2F3xcc2iV5WdqLPpUnj30aUuxt1mAxYTG+oe8CZMV/+6rU4S4gRDzqtQ=="],

    "ansi-regex": ["ansi-regex@6.2.2", "", {}, "sha512-Bq3SmSpyFHaWjPk8If9yc6svM8c56dB5BAtW4Qbw5jHTwwXXcTLoRMkpDJp6VL0XzlWaCHTXrkFURMYmD0sLqg=="],

    "ansi-styles": ["ansi-styles@6.2.3", "", {}, "sha512-4Dj6M28JB+oAH8kFkTLUo+a2jwOFkuqb3yucU0CANcRRUbxS0cP0nZYCGjcc3BNXwRIsUVmDGgzawme7zvJHvg=="],

    "braces": ["braces@3.0.3", "", { "dependencies": { "fill-range": "^7.1.1" } }, "sha512-yQbXgO/OSZVD2IsiLlro+7Hf6Q18EJrKSEsdoMzKePKXct3gvD8oLcOQdIzGupr5Fj+EDe8gO/lxc1BzfMpxvA=="],

    "bun-types": ["bun-types@1.3.8", "", { "dependencies": { "@types/node": "*" } }, "sha512-fL99nxdOWvV4LqjmC+8Q9kW3M4QTtTR1eePs94v5ctGqU8OeceWrSUaRw3JYb7tU3FkMIAjkueehrHPPPGKi5Q=="],

    "cliui": ["cliui@9.0.1", "", { "dependencies": { "string-width": "^7.2.0", "strip-ansi": "^7.1.0", "wrap-ansi": "^9.0.0" } }, "sha512-k7ndgKhwoQveBL+/1tqGJYNz097I7WOvwbmmU2AR5+magtbjPWQTS1C5vzGkBC8Ym8UWRzfKUzUUqFLypY4Q+w=="],

    "emoji-regex": ["emoji-regex@10.6.0", "", {}, "sha512-toUI84YS5YmxW219erniWD0CIVOo46xGKColeNQRgOzDorgBi1v4D71/OFzgD9GO2UGKIv1C3Sp8DAn0+j5w7A=="],

    "escalade": ["escalade@3.2.0", "", {}, "sha512-WUj2qlxaQtO4g6Pq5c29GTcWGDyd8itL8zTlipgECz3JesAiiOKotd8JU6otB3PACgG6xkJUyVhboMS+bje/jA=="],

    "fast-glob": ["fast-glob@3.3.3", "", { "dependencies": { "@nodelib/fs.stat": "^2.0.2", "@nodelib/fs.walk": "^1.2.3", "glob-parent": "^5.1.2", "merge2": "^1.3.0", "micromatch": "^4.0.8" } }, "sha512-7MptL8U0cqcFdzIzwOTHoilX9x5BrNqye7Z/LuC7kCMRio1EMSyqRK3BEAUD7sXRq4iT4AzTVuZdhgQ2TCvYLg=="],

    "fastq": ["fastq@1.20.1", "", { "dependencies": { "reusify": "^1.0.4" } }, "sha512-GGToxJ/w1x32s/D2EKND7kTil4n8OVk/9mycTc4VDza13lOvpUZTGX3mFSCtV9ksdGBVzvsyAVLM6mHFThxXxw=="],

    "fill-range": ["fill-range@7.1.1", "", { "dependencies": { "to-regex-range": "^5.0.1" } }, "sha512-YsGpe3WHLK8ZYi4tWDg2Jy3ebRz2rXowDxnld4bkQB00cc/1Zw9AWnC0i9ztDJitivtQvaI9KaLyKrc+hBW0yg=="],

    "get-caller-file": ["get-caller-file@2.0.5", "", {}, "sha512-DyFP3BM/3YHTQOCUL/w0OZHR0lpKeGrxotcHWcqNEdnltqFwXVfhEBQ94eIo34AfQpo0rGki4cyIiftY06h2Fg=="],

    "get-east-asian-width": ["get-east-asian-width@1.4.0", "", {}, "sha512-QZjmEOC+IT1uk6Rx0sX22V6uHWVwbdbxf1faPqJ1QhLdGgsRGCZoyaQBm/piRdJy/D2um6hM1UP7ZEeQ4EkP+Q=="],

    "github-slugger": ["github-slugger@2.0.0", "", {}, "sha512-IaOQ9puYtjrkq7Y0Ygl9KDZnrf/aiUJYUpVf89y8kyaxbRG7Y1SrX/jaumrv81vc61+kiMempujsM3Yw7w5qcw=="],

    "glob-parent": ["glob-parent@5.1.2", "", { "dependencies": { "is-glob": "^4.0.1" } }, "sha512-AOIgSQCepiJYwP3ARnGx+5VnTu2HBYdzbGP45eLw1vr3zB3vZLeyed1sC9hnbcOc9/SrMyM5RPQrkGz4aS9Zow=="],

    "globby": ["globby@16.1.0", "", { "dependencies": { "@sindresorhus/merge-streams": "^4.0.0", "fast-glob": "^3.3.3", "ignore": "^7.0.5", "is-path-inside": "^4.0.0", "slash": "^5.1.0", "unicorn-magic": "^0.4.0" } }, "sha512-+A4Hq7m7Ze592k9gZRy4gJ27DrXRNnC1vPjxTt1qQxEY8RxagBkBxivkCwg7FxSTG0iLLEMaUx13oOr0R2/qcQ=="],

    "ignore": ["ignore@7.0.5", "", {}, "sha512-Hs59xBNfUIunMFgWAbGX5cq6893IbWg4KnrjbYwX3tx0ztorVgTDA6B2sxf8ejHJ4wz8BqGUMYlnzNBer5NvGg=="],

    "is-extglob": ["is-extglob@2.1.1", "", {}, "sha512-SbKbANkN603Vi4jEZv49LeVJMn4yGwsbzZworEoyEiutsN3nJYdbO36zfhGJ6QEDpOZIFkDtnq5JRxmvl3jsoQ=="],

    "is-glob": ["is-glob@4.0.3", "", { "dependencies": { "is-extglob": "^2.1.1" } }, "sha512-xelSayHH36ZgE7ZWhli7pW34hNbNl8Ojv5KVmkJD4hBdD3th8Tfk9vYasLM+mXWOZhFkgZfxhLSnrwRr4elSSg=="],

    "is-number": ["is-number@7.0.0", "", {}, "sha512-41Cifkg6e8TylSpdtTpeLVMqvSBEVzTttHvERD741+pnZ8ANv0004MRL43QKPDlK9cGvNp6NZWZUBlbGXYxxng=="],

    "is-path-inside": ["is-path-inside@4.0.0", "", {}, "sha512-lJJV/5dYS+RcL8uQdBDW9c9uWFLLBNRyFhnAKXw5tVqLlKZ4RMGZKv+YQ/IA3OhD+RpbJa1LLFM1FQPGyIXvOA=="],

    "merge2": ["merge2@1.4.1", "", {}, "sha512-8q7VEgMJW4J8tcfVPy8g09NcQwZdbwFEqhe/WZkoIzjn/3TGDwtOCYtXGxA3O8tPzpczCCDgv+P2P5y00ZJOOg=="],

    "micromatch": ["micromatch@4.0.8", "", { "dependencies": { "braces": "^3.0.3", "picomatch": "^2.3.1" } }, "sha512-PXwfBhYu0hBCPw8Dn0E+WDYb7af3dSLVWKi3HGv84IdF4TyFoC0ysxFd0Goxw7nSv4T/PzEJQxsYsEiFCKo2BA=="],

    "minimatch": ["minimatch@10.1.2", "", { "dependencies": { "@isaacs/brace-expansion": "^5.0.1" } }, "sha512-fu656aJ0n2kcXwsnwnv9g24tkU5uSmOlTjd6WyyaKm2Z+h1qmY6bAjrcaIxF/BslFqbZ8UBtbJi7KgQOZD2PTw=="],

    "picomatch": ["picomatch@2.3.1", "", {}, "sha512-JU3teHTNjmE2VCGFzuY8EXzCDVwEqB2a8fsIvwaStHhAWJEeVd1o1QD80CU6+ZdEXXSLbSsuLwJjkCBWqRQUVA=="],

    "queue-microtask": ["queue-microtask@1.2.3", "", {}, "sha512-NuaNSa6flKT5JaSYQzJok04JzTL1CA6aGhv5rfLW3PgqA+M2ChpZQnAC8h8i4ZFkBS8X5RqkDBHA7r4hej3K9A=="],

    "reusify": ["reusify@1.1.0", "", {}, "sha512-g6QUff04oZpHs0eG5p83rFLhHeV00ug/Yf9nZM6fLeUrPguBTkTQOdpAWWspMh55TZfVQDPaN3NQJfbVRAxdIw=="],

    "run-parallel": ["run-parallel@1.2.0", "", { "dependencies": { "queue-microtask": "^1.2.2" } }, "sha512-5l4VyZR86LZ/lDxZTR6jqL8AFE2S0IFLMP26AbjsLVADxHdhB/c0GUsH+y39UfCi3dzz8OlQuPmnaJOMoDHQBA=="],

    "slash": ["slash@5.1.0", "", {}, "sha512-ZA6oR3T/pEyuqwMgAKT0/hAv8oAXckzbkmR0UkUosQ+Mc4RxGoJkRmwHgHufaenlyAgE1Mxgpdcrf75y6XcnDg=="],

    "string-width": ["string-width@7.2.0", "", { "dependencies": { "emoji-regex": "^10.3.0", "get-east-asian-width": "^1.0.0", "strip-ansi": "^7.1.0" } }, "sha512-tsaTIkKW9b4N+AEj+SVA+WhJzV7/zMhcSu78mLKWSk7cXMOSHsBKFWUs0fWwq8QyK3MgJBQRX6Gbi4kYbdvGkQ=="],

    "strip-ansi": ["strip-ansi@7.1.2", "", { "dependencies": { "ansi-regex": "^6.0.1" } }, "sha512-gmBGslpoQJtgnMAvOVqGZpEz9dyoKTCzy2nfz/n8aIFhN/jCE/rCmcxabB6jOOHV+0WNnylOxaxBQPSvcWklhA=="],

    "to-regex-range": ["to-regex-range@5.0.1", "", { "dependencies": { "is-number": "^7.0.0" } }, "sha512-65P7iz6X5yEr1cwcgvQxbbIw7Uk3gOy5dIdtZ4rDveLqhrdJP+Li/Hx6tyK0NEb+2GCyneCMJiGqrADCSNk8sQ=="],

    "typescript": ["typescript@5.9.3", "", { "bin": { "tsc": "bin/tsc", "tsserver": "bin/tsserver" } }, "sha512-jl1vZzPDinLr9eUt3J/t7V6FgNEw9QjvBPdysz9KfQDD41fQrC2Y4vKQdiaUpFT4bXlb1RHhLpp8wtm6M5TgSw=="],

    "undici-types": ["undici-types@7.16.0", "", {}, "sha512-Zz+aZWSj8LE6zoxD+xrjh4VfkIG8Ya6LvYkZqtUQGJPZjYl53ypCaUwWqo7eI0x66KBGeRo+mlBEkMSeSZ38Nw=="],

    "unicorn-magic": ["unicorn-magic@0.4.0", "", {}, "sha512-wH590V9VNgYH9g3lH9wWjTrUoKsjLF6sGLjhR4sH1LWpLmCOH0Zf7PukhDA8BiS7KHe4oPNkcTHqYkj7SOGUOw=="],

    "wrap-ansi": ["wrap-ansi@9.0.2", "", { "dependencies": { "ansi-styles": "^6.2.1", "string-width": "^7.0.0", "strip-ansi": "^7.1.0" } }, "sha512-42AtmgqjV+X1VpdOfyTGOYRi0/zsoLqtXQckTmqTeybT+BDIbM/Guxo7x3pE2vtpr1ok6xRqM9OpBe+Jyoqyww=="],

    "y18n": ["y18n@5.0.8", "", {}, "sha512-0pfFzegeDWJHJIAmTLRP2DwHjdF5s7jo9tuztdQxAhINCdvS+3nGINqPd00AphqJR/0LhANUS6/+7SCb98YOfA=="],

    "yargs": ["yargs@18.0.0", "", { "dependencies": { "cliui": "^9.0.1", "escalade": "^3.1.1", "get-caller-file": "^2.0.5", "string-width": "^7.2.0", "y18n": "^5.0.5", "yargs-parser": "^22.0.0" } }, "sha512-4UEqdc2RYGHZc7Doyqkrqiln3p9X2DZVxaGbwhn2pi7MrRagKaOcIKe8L3OxYcbhXLgLFUS3zAYuQjKBQgmuNg=="],

    "yargs-parser": ["yargs-parser@22.0.0", "", {}, "sha512-rwu/ClNdSMpkSrUb+d6BRsSkLUq1fmfsY6TOpYzTwvwkg1/NRG85KBy3kq++A8LKQwX6lsu+aWad+2khvuXrqw=="],
  }
}

```

<a id="flakelock"></a>
# flake.lock

```lock
{
  "nodes": {
    "flake-utils": {
      "inputs": {
        "systems": "systems"
      },
      "locked": {
        "lastModified": 1731533236,
        "narHash": "sha256-l0KFg5HjrsfsO/JpG+r7fRrqm12kzFHyUHqHCVpMMbI=",
        "owner": "numtide",
        "repo": "flake-utils",
        "rev": "11707dc2f618dd54ca8739b309ec4fc024de578b",
        "type": "github"
      },
      "original": {
        "owner": "numtide",
        "repo": "flake-utils",
        "type": "github"
      }
    },
    "nixpkgs": {
      "locked": {
        "lastModified": 1770115704,
        "narHash": "sha256-KHFT9UWOF2yRPlAnSXQJh6uVcgNcWlFqqiAZ7OVlHNc=",
        "owner": "NixOS",
        "repo": "nixpkgs",
        "rev": "e6eae2ee2110f3d31110d5c222cd395303343b08",
        "type": "github"
      },
      "original": {
        "owner": "NixOS",
        "ref": "nixos-unstable",
        "repo": "nixpkgs",
        "type": "github"
      }
    },
    "root": {
      "inputs": {
        "flake-utils": "flake-utils",
        "nixpkgs": "nixpkgs"
      }
    },
    "systems": {
      "locked": {
        "lastModified": 1681028828,
        "narHash": "sha256-Vy1rq5AaRuLzOxct8nz4T6wlgyUR7zLU309k9mBC768=",
        "owner": "nix-systems",
        "repo": "default",
        "rev": "da67096a3b9bf56a91d16901293e51ba5b49a27e",
        "type": "github"
      },
      "original": {
        "owner": "nix-systems",
        "repo": "default",
        "type": "github"
      }
    }
  },
  "root": "root",
  "version": 7
}

```

<a id="flakenix"></a>
# flake.nix

```nix
{
  description = "flatten-tool - a CLI tool to flatten directory structures";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        # Read and parse package.json
        pkgJson = builtins.fromJSON (builtins.readFile ./package.json);
      in
      {
        packages.flatten-tool = pkgs.stdenv.mkDerivation {
          pname = pkgJson.name or "flatten-tool"; # Fallback if no 'name' in package.json
          version = pkgJson.version or "0.0.0"; # Fallback if no 'version'
          src = ./.;
          nativeBuildInputs = [ pkgs.bun ];
          buildInputs = [ pkgs.makeWrapper ];
          installPhase = ''
            mkdir -p $out/bin
            cp index.ts package.json $out/
            makeWrapper ${pkgs.bun}/bin/bun $out/bin/flatten-tool \
              --add-flags $out/index.ts
          '';
        };
        packages.default = self.packages.${system}.flatten-tool;
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            bun
            biome
          ];
        };
      }
    );
}

```

<a id="indexts"></a>
# index.ts

```ts
#!/usr/bin/env bun
import { createReadStream, createWriteStream } from 'node:fs';
import { copyFile, mkdir, readdir, readFile, rename, rm, rmdir, stat, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { finished, pipeline } from 'node:stream/promises';
import { globby } from 'globby';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import pkg from './package.json' assert { type: 'json' };

import GithubSlugger from 'github-slugger';

function escapePathComponent(component: string): string {
  return component.replace(/_/g, '__');
}

function buildTreeObject(relPaths: string[]): any {
  const tree: any = {};
  for (const path of relPaths) {
    const parts = path.split('/');
    let node = tree;
    const currentParts: string[] = [];
    for (const [index, part] of parts.entries()) {
      currentParts.push(part);
      const isDir = index < parts.length - 1;
      const key = isDir ? `${part}/` : part;
      if (node[key] === undefined) {
        node[key] = isDir ? {} : currentParts.join('/');
      }
      if (isDir) {
        node = node[key];
      }
    }
  }
  return tree;
}

async function removeEmptyDirs(dir: string, root?: string): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await removeEmptyDirs(join(dir, entry.name), root);
    }
  }
  if (dir !== root) {
    try {
      await rmdir(dir);
    } catch {
      // Not empty, skip
    }
  }
}

export async function flattenDirectory(
  source: string,
  target: string,
  move: boolean = false,
  overwrite: boolean = false,
  ignorePatterns: string[] = [],
  respectGitignore: boolean = true,
  flattenToDirectory: boolean = false
): Promise<void> {
  const absSource = resolve(source);
  const absTarget = resolve(target);

  if (absSource === absTarget) {
    console.log('Source and target are the same; skipping.');
    return;
  }

  // Patterns explicitly ignored (in addition to .gitignore when enabled)
  const extraIgnores = ignorePatterns.map(pattern => `!${pattern}`);

  const defaultIgnores = ['.git'];
  if (!flattenToDirectory) {
    // Common binary/media extensions that would corrupt UTF-8 text output
    const binaryExts = [
      'gif', 'png', 'jpg', 'jpeg', 'webp', 'svg', 'bmp', 'ico',
      'pdf', 'zip', 'tar', 'gz', 'xz', '7z',
      'mp3', 'mp4', 'webm', 'ogg', 'wav',
      'exe', 'dll', 'so', 'dylib', 'bin'
    ];
    defaultIgnores.push(`**/*.{${binaryExts.join(',')}}`);
  }

  const files = await globby(['**', ...extraIgnores], {
    cwd: absSource,
    gitignore: respectGitignore,
    absolute: true,
    dot: true,
    onlyFiles: true,
    ignore: defaultIgnores,
  });

  if (!flattenToDirectory) {
    // Check if target exists
    try {
      await stat(absTarget);
      if (!overwrite) {
        throw new Error(`Target file "${absTarget}" already exists. Use --overwrite to force.`);
      }
      console.warn(`Overwriting existing file: ${absTarget}`);
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }

    const fileEntries = files.map(srcPath => ({
      srcPath,
      relPath: relative(absSource, srcPath).replace(/\\/g, '/')
    }));

    const relPaths = fileEntries.map(e => e.relPath);
    const treeObj = buildTreeObject(relPaths);

    // Map for quick lookup of srcPath by relPath
    const pathMap = new Map<string, string>();
    fileEntries.forEach(({ srcPath, relPath }) => {
      pathMap.set(relPath, srcPath);
    });

    // === NEW: Precompute anchors in document order ===
    interface Section {
      path: string;
      headerText: string;
    }

    const sections: Section[] = [];

    function collectSections(node: any, currentPath: string): void {
      const dirs: { name: string; child: any }[] = [];
      const files: { relPath: string }[] = [];

      for (const [key, value] of Object.entries(node) as [string, any][]) {
        if (key.endsWith('/')) {
          const name = key.slice(0, -1);
          dirs.push({ name, child: value });
        } else {
          files.push({ relPath: value as string });
        }
      }

      dirs.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      files.sort((a, b) => a.relPath.toLowerCase().localeCompare(b.relPath.toLowerCase()));

      for (const dir of dirs) {
        const newPath = currentPath ? `${currentPath}/${dir.name}` : dir.name;
        collectSections(dir.child, newPath);
      }

      if (currentPath) {
        sections.push({ path: currentPath, headerText: currentPath }); // no trailing /
      }

      for (const file of files) {
        sections.push({ path: file.relPath, headerText: file.relPath });
      }
    }

    sections.push({ path: '', headerText: 'Project File Tree' });

    collectSections(treeObj, '');

    const anchorMap = new Map<string, string>();
    const anchorSlugger = new GithubSlugger();
    for (const sec of sections) {
      anchorMap.set(sec.path, anchorSlugger.slug(sec.headerText));
    }
    // === END NEW ===

    // Updated renderMarkdownTree to use precomputed anchors
    function renderMarkdownTree(
      node: any,
      depth: number = 0,
      prefix: string = '',
      anchorMap: Map<string, string>,
      parentPath: string | null  // null for global root (no ..)
    ): string {
      let result = '';
      const indent = '  '.repeat(depth);

      // Add .. if we have a parent
      if (parentPath !== null && depth === 0) {
        const parentAnchor = anchorMap.get(parentPath) ?? '';
        result += `${indent}- [..](#${parentAnchor})\n`;
      }

      // Determine indentation for direct children
      const entryIndent = '  '.repeat(depth);

      const entries: [string, any][] = Object.entries(node);

      entries.sort(([a], [b]) => {
        const aDir = a.endsWith('/');
        const bDir = b.endsWith('/');
        if (aDir !== bDir) return aDir ? -1 : 1;
        return a.toLowerCase().localeCompare(b.toLowerCase());
      });

      for (const [key, value] of entries) {
        const isDir = key.endsWith('/');
        const name = isDir ? key.slice(0, -1) : key;
        const display = isDir ? name + '/' : name;
        const pathHere = prefix ? `${prefix}/${name}` : name;
        const anchor = anchorMap.get(pathHere) ?? '';

        result += `${entryIndent}- [${display}](#${anchor})\n`;

        if (isDir) {
          // Recurse with increased depth; child's parent is current prefix
          result += renderMarkdownTree(
            value,
            depth + 1,
            pathHere,
            anchorMap,
            prefix
          );
        }
      }

      return result;
    }

    // Render global tree with correct anchors
    let treeMarkdown = `<a id="${anchorMap.get('')!}"></a>\n# Project File Tree\n\n`;
    treeMarkdown += renderMarkdownTree(treeObj, 0, '', anchorMap, null);
    treeMarkdown += "\n\n";

    const writeStream = createWriteStream(absTarget);
    writeStream.setMaxListeners(0);
    writeStream.write(treeMarkdown);

    async function writeContentRecursive(
      node: any,
      currentPath: string,
      writeStream: import('node:fs').WriteStream,
      pathMap: Map<string, string>
    ): Promise<void> {
      const dirs: { name: string; child: any }[] = [];
      const files: { name: string; relPath: string; srcPath: string }[] = [];

      for (const [key, value] of Object.entries(node) as [string, any][]) {
        if (key.endsWith('/')) {
          const name = key.slice(0, -1);
          dirs.push({ name, child: value });
        } else {
          const relPath = value as string;
          const srcPath = pathMap.get(relPath)!;
          const name = key;
          files.push({ name, relPath, srcPath });
        }
      }

      dirs.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      files.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

      for (const dir of dirs) {
        const newPath = currentPath ? `${currentPath}/${dir.name}` : dir.name;
        await writeContentRecursive(dir.child, newPath, writeStream, pathMap);
      }

      // Directory section (only for non-root) — no trailing /
      if (currentPath) {
        const anchor = anchorMap.get(currentPath)!;
        writeStream.write(`<a id="${anchor}"></a>\n# ${currentPath}\n\n`);
        writeStream.write('File Tree\n\n');

        const parentPath = currentPath.includes('/')
          ? currentPath.slice(0, currentPath.lastIndexOf('/'))
          : '';

        writeStream.write(renderMarkdownTree(node, 0, currentPath, anchorMap, parentPath));
        writeStream.write('\n');
      }

      for (const file of files) {
        const anchor = anchorMap.get(file.relPath)!;
        writeStream.write(`<a id="${anchor}"></a>\n# ${file.relPath}\n\n`);

        const ext = extname(file.srcPath).slice(1) || 'text';
        const lang = ext;
        const isMd = ['md', 'markdown'].includes(ext.toLowerCase());
        const ticks = isMd ? '````' : '```';

        writeStream.write(`${ticks}${lang}\n`);

        const readStream = createReadStream(file.srcPath, { encoding: 'utf8' });
        await pipeline(readStream, writeStream, { end: false });

        writeStream.write(`\n${ticks}\n\n`);
      }
    }

    await writeContentRecursive(treeObj, '', writeStream, pathMap);

    writeStream.end();
    await finished(writeStream);

    if (move) {
      for (const srcPath of files) {
        await rm(srcPath);
      }
      await removeEmptyDirs(absSource, absSource);
    }
  } else {
    await mkdir(absTarget, { recursive: true });

    for (const srcPath of files) {
      const relPath = relative(absSource, srcPath);
      const components = relPath.split(sep);
      const escapedComponents = components.map(escapePathComponent);
      const newName = escapedComponents.join('_');
      const tgtPath = join(absTarget, newName);

      try {
        await stat(tgtPath);
        if (!overwrite) {
          throw new Error(`Target file "${tgtPath}" already exists. Use --overwrite to force.`);
        }
        console.warn(`Overwriting existing file: ${tgtPath}`);
      } catch (err: any) {
        if (err.code !== 'ENOENT') throw err;
      }

      if (move) {
        await rename(srcPath, tgtPath);
      } else {
        await copyFile(srcPath, tgtPath);
      }
    }

    if (move) {
      await removeEmptyDirs(absSource, absSource);
    }
  }
}

// Main CLI logic
if (import.meta.url === `file://${process.argv[1]}`) {
  yargs(hideBin(process.argv))
    .command('$0 [source] [target]', 'Flatten or merge a directory structure (default source: current directory)', (yargs) => {
      yargs
        .positional('source', {
          describe: 'Directory to flatten (default: current directory ".")',
          type: 'string',
          default: '.',
        })
        .positional('target', {
          describe: 'Target file or directory. Default: flattened.md or flattened/ depending on --directory',
          type: 'string',
        })
        .option('move', {
          alias: 'm',
          describe: 'Move files instead of copying (original files will be deleted)',
          type: 'boolean',
          default: false,
        })
        .option('overwrite', {
          alias: 'o',
          describe: 'Overwrite existing files in target if conflicts occur',
          type: 'boolean',
          default: false,
        })
        .option('gitignore', {
          alias: 'g',
          describe: 'Respect .gitignore files (default: true). Use --no-gitignore to include everything',
          type: 'boolean',
          default: true,
        })
        .option('directory', {
          alias: 'd',
          describe: 'Flatten files into a directory structure (escaped filenames). When not set, merges everything into a single Markdown file (default behavior).',
          type: 'boolean',
          default: false,
        })
        .option('ignore', {
          alias: 'i',
          type: 'string',
          array: true,
          describe: 'Additional glob patterns to ignore (e.g. "*.log" "temp/**")',
          default: [],
        })
    }, async (argv) => {
      const source = argv.source as string;           // now always defined (default '.')
      let target = argv.target as string;           // may be undefined

      const move: boolean = argv.move as boolean;
      const overwrite: boolean = argv.overwrite as boolean;
      const ignorePatterns: string[] = (argv.ignore as string[] | undefined) ?? [];
      const respectGitignore: boolean = argv.gitignore as boolean;
      const flattenToDirectory: boolean = argv.directory as boolean;

      // If user didn't provide explicit target, choose sensible default
      if (!target) {
        target = flattenToDirectory
          ? join(process.cwd(), 'flattened')
          : join(process.cwd(), 'flattened.md');
      }

      try {
        await stat(source);
      } catch {
        console.error(`Source directory "${source}" does not exist.`);
        process.exit(1);
      }

      const action = move ? 'moved' : 'copied';
      const mode = flattenToDirectory ? 'directory' : 'Markdown file';
      await flattenDirectory(source, target, move, overwrite, ignorePatterns, respectGitignore, flattenToDirectory);
      console.log(`Directory flattened successfully (${action}) into ${target} (${mode}).`);
    })
    .help('h')
    .alias('h', 'help')
    .version(pkg.version ?? '0.0.0')
    .alias('v', 'version')
    .parse();
}
```

<a id="license"></a>
# LICENSE

```text
MIT License

Copyright (c) 2026 Your Name

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

<a id="packagejson"></a>
# package.json

```json
{
  "name": "flatten-tool",
  "version": "1.7.0",
  "description": "CLI tool to flatten directory structures: merge files into a single Markdown file (default) or copy/move to a flat directory with escaped filenames. Respects .gitignore, supports move/overwrite, and more.",
  "module": "index.ts",
  "type": "module",
  "bin": {
    "flatten-tool": "index.ts"
  },
  "scripts": {
    "test": "bun test",
    "format": "biome format --write .",
    "lint": "biome lint .",
    "check": "biome check --write ."
  },
  "engines": {
    "bun": ">=1.1.0"
  },
  "keywords": [
    "flatten",
    "directory",
    "cli",
    "markdown",
    "merge",
    "filesystem",
    "bun",
    "gitignore"
  ],
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/MBanucu/flatten-tool.git"
  },
  "bugs": {
    "url": "https://github.com/MBanucu/flatten-tool/issues"
  },
  "homepage": "https://github.com/MBanucu/flatten-tool#readme",
  "files": [
    "index.ts",
    "README.md",
    "LICENSE"
  ],
  "devDependencies": {
    "@biomejs/biome": "^2.3.14",
    "@types/bun": "latest",
    "@types/yargs": "^17.0.35"
  },
  "peerDependencies": {
    "typescript": "^5.9.3"
  },
  "dependencies": {
    "github-slugger": "^2.0.0",
    "globby": "^16.1.0",
    "ignore": "^7.0.5",
    "minimatch": "^10.1.2",
    "yargs": "^18.0.0"
  }
}

```

<a id="readmemd"></a>
# README.md

````md
# flatten-tool

[![npm version](https://img.shields.io/npm/v/flatten-tool)](https://www.npmjs.com/package/flatten-tool)

A CLI utility to flatten directory structures, with perfect GitHub Flavored Markdown compatibility including explicit HTML anchors for maximum portability.

[![Video thumbnail](https://i.ytimg.com/vi/LCbSoK0Mkjk/maxresdefault.jpg)](https://youtu.be/LCbSoK0Mkjk)  
*Watch the YouTube video for an example of why you might need to flatten project files into a single document for AI discussions and code reviews.*

[![asciicast](docs/demo.gif)](https://asciinema.org/a/ThswNC1vrdlK0wdD)

## Installation

Requires [Bun](https://bun.sh) runtime (v1.1+).

### Via npm

```bash
npm install -g flatten-tool
```

### Run without installation

You can run flatten-tool directly without installing:

```bash
npx flatten-tool [args]
bunx flatten-tool [args]
```

### For Development

Clone the repository and install dependencies:

```bash
git clone https://github.com/MBanucu/flatten-tool.git
cd flatten-tool
bun install
```

Run directly with Bun:

```bash
bun run index.ts [args]
```

## Usage

By default, the tool merges all file contents into a single Markdown file, starting with a project file tree for navigation, followed by each file's content under a header with its full relative path, in a code block with appropriate language highlighting based on the file extension. The tree includes clickable links to file sections using GitHub-compatible anchors. Ignores and filters are applied as usual.

The `<source>` argument is optional and defaults to the current directory (`.`). The `<target>` argument is also optional and defaults to `flattened.md` (or `flattened/` when using `--directory`).

### Options

- `--directory`, `-d`: Flatten to individual files in a directory instead of merging to Markdown.
- `--move`, `-m`: Move files instead of copying (original files will be deleted).
- `--overwrite`, `-o`: Overwrite existing target files.
- `--gitignore`, `-g`: Respect `.gitignore` files (default: true). Use `--no-gitignore` to disable.
- `--help`, `-h`: Show help.
- `--version`, `-v`: Show version.

### Examples

Flatten current directory to `flattened.md`:

```bash
flatten-tool
```

Flatten a specific directory to `flattened.md`:

```bash
flatten-tool /path/to/source
```

Flatten current directory to a custom Markdown file:

```bash
flatten-tool output.md
```

Flatten a specific directory to a custom Markdown file:

```bash
flatten-tool /path/to/source output.md
```

Flatten to individual files in a directory:

```bash
flatten-tool --directory
```

This creates a `flattened/` directory with flattened files.

Flatten a specific directory to a custom output directory:

```bash
flatten-tool /path/to/source output-dir --directory
```

Move files instead of copying:

```bash
flatten-tool --move
```

Overwrite existing files:

```bash
flatten-tool --overwrite
```

Combine options:

```bash
flatten-tool /path/to/source output.md --move --overwrite
```

## Testing

Run all tests:

```bash
bun test
```

Run tests in watch mode:

```bash
bun test --watch
```

Run a specific test:

```bash
bun test -t "flattens a simple nested directory"
```

## Development

This project uses Bun for runtime, TypeScript for type safety, and follows the guidelines in `AGENTS.md` for coding standards.

## Changelog

### v1.7.0
- Added explicit HTML anchors (`<a id="..."></a>`) before all headings for guaranteed compatibility across platforms that don't auto-generate heading IDs, maximum control over anchor names, and stable links.

### v1.6.3
- Enhanced safety: Automatically exclude common binary file extensions (PNG, JPEG, PDF, archives, executables, etc.) when merging to Markdown to prevent corruption.
- Added `--ignore` CLI option: Allow additional glob patterns to ignore (e.g., `*.log`, `temp/**`).
- Minor clean-ups: Improved variable naming and code consistency.
- Added YouTube video link in README demonstrating use case for AI discussions.

### v1.6.2
- Updated AGENTS.md with revised coding guidelines.
- Added '..' links in subdirectory file trees for navigation to parent directories.

### v1.6.1
- Added instructions for running flatten-tool directly with npx and bunx.

### v1.6.0
- Perfect GitHub compatibility: anchors now exactly match GitHub Flavored Markdown auto-generation using github-slugger.
- Cleaner directory headers: removed trailing `/` for better readability.
- Precomputed anchors: ensures no mismatches even with slug collisions.
- Removed unused treeify dependency.

### v1.5.0
- Improved navigation: project file tree is now a clickable nested Markdown list with links to each file's content section using standard markdown anchors.
- Simplified file headers: removed custom anchors from section headers.

### v1.4.0
- Added project file tree to the beginning of merged Markdown output for better navigation.

### v1.3.1
- Fixed GIF exclusion pattern to work recursively in subdirectories.

### v1.3.0
- Excluded GIF files by default when merging to Markdown to prevent binary content corruption.

### v1.2.3
- Added demo.gif to docs/ and linked in README.md.

### v1.2.2
- Added `setMaxListeners(0)` on WriteStream in Markdown merging to silence listener warnings when processing many files.

### v1.2.1
- Fixed memory leak warnings in Markdown merging by refactoring to use `pipeline` and `finished` from `node:stream/promises`.

### v1.2.0
- Implemented streaming for Markdown merging to improve memory efficiency for large files/directories.
- Updated documentation and coding guidelines.

### v1.1.0
- Made source argument optional (defaults to current directory).
- Improved CLI defaults and options.

### v1.0.0
- Initial release with Markdown merging and directory flattening capabilities.

## License

This project was created using `bun init` in bun v1.3.8. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
````

