# flatten-tool

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.3.8. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## Usage

By default, the tool merges all file contents into a single Markdown file, with each file's content placed under a header with its relative path, followed by a code block with appropriate language highlighting based on the file extension. Ignores and filters are applied as usual.

The `<source>` argument is optional and defaults to the current directory (`.`). The `<target>` argument is also optional and defaults to `flattened.md` (or `flattened/` when using `--directory`).

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

Flatten to individual files in a directory (instead of merging to Markdown):

```bash
bun run index.ts --directory
```

This will create a `flattened/` directory with flattened files.

Flatten a specific directory to a custom output directory:

```bash
bun run index.ts /path/to/source output-dir --directory
```

If `--move` is used, original files are deleted after processing.