# flatten-tool

A CLI utility built with Bun and TypeScript that flattens directory structures. It can either merge all file contents into a single Markdown file (default behavior) or flatten files into a directory with escaped path components in filenames.

**Version:** 1.2.0

## Features

- **Markdown Merging (Default):** Merges all files into a single Markdown file with headers, code fences, and proper language highlighting. Uses streaming for memory-efficient handling of large directories/files.
- **Directory Flattening:** Flattens files into a directory with escaped filenames to avoid conflicts.
- **Gitignore Support:** Respects `.gitignore` files by default.
- **Move or Copy:** Option to move files instead of copying.
- **Overwrite Control:** Prevents accidental overwrites unless specified.
- **Cross-Platform:** Works on Linux, macOS, and Windows.

## Installation

### Using Bun

```bash
bun install
```

### Using Nix (Reproducible)

```bash
nix build .
# Or run directly: nix run .
```

### Build for Production

```bash
bun build ./index.ts --compile --outfile flatten-tool
```

## Usage

By default, the tool merges all file contents into a single Markdown file, with each file's content placed under a header with its relative path, followed by a code block with appropriate language highlighting based on the file extension. Ignores and filters are applied as usual.

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
bun run index.ts
```

Flatten a specific directory to `flattened.md`:

```bash
bun run index.ts /path/to/source
```

Flatten current directory to a custom Markdown file:

```bash
bun run index.ts output.md
```

Flatten a specific directory to a custom Markdown file:

```bash
bun run index.ts /path/to/source output.md
```

Flatten to individual files in a directory:

```bash
bun run index.ts --directory
```

This creates a `flattened/` directory with flattened files.

Flatten a specific directory to a custom output directory:

```bash
bun run index.ts /path/to/source output-dir --directory
```

Move files instead of copying:

```bash
bun run index.ts --move
```

Overwrite existing files:

```bash
bun run index.ts --overwrite
```

Combine options:

```bash
bun run index.ts /path/to/source output.md --move --overwrite
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