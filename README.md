# flatten-tool

[![npm version](https://img.shields.io/npm/v/flatten-tool)](https://www.npmjs.com/package/flatten-tool)

A CLI utility to flatten directory structures, with perfect GitHub Flavored Markdown compatibility.

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