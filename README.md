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

#### With devenv (recommended)

Clone the repository and enter the development environment:

```bash
git clone https://github.com/MBanucu/flatten-tool.git
cd flatten-tool
devenv shell
```

Inside the devenv shell, dependencies are managed automatically. Run the tool with:

```bash
bun run index.ts [args]
```

#### Without devenv

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

- `--clipboard`, `-c`: Copy the generated Markdown content to clipboard (only for Markdown mode).
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

Flatten current directory to Markdown and copy to clipboard:

```bash
flatten-tool --clipboard
```

## Testing

Run all tests:

```bash
unittest  # If using devenv
bun unittest  # Otherwise
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

### Development Scripts (devenv)

When using devenv, the following scripts are available:

- `check`: Format + lint in one go
- `format`: Format code with Biome
- `lint`: Run Biome lint
- `unittest`: Run all tests with Bun

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a full list of changes.

## License

This project was created using `bun init` in bun v1.3.8. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.