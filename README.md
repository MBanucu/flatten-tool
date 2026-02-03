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

Example (default merge to Markdown):

```bash
bun run index.ts /path/to/source --target /path/to/output.md
```

This will create `output.md` with contents like:

# file1.txt

```txt
content1
```

# subdir/file2.js

```js
content2
```

To flatten to individual files instead of merging to Markdown:

```bash
bun run index.ts /path/to/source --no-merge-md --target /path/to/output/dir
```

If `--move` is used, original files are deleted after processing.