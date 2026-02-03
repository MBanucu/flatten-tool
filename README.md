# flatten-tool

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.js
```

This project was created using `bun init` in bun v1.3.8. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## Merge to Markdown Feature

Use the `--merge-md` flag to concatenate all file contents into a single Markdown file instead of flattening to individual files. Each file's content is placed under a header with its relative path, followed by a code block with appropriate language highlighting based on the file extension.

Example:

```bash
bun run index.ts /path/to/source --merge-md --target /path/to/output.md
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

If `--move` is used, original files are deleted after merging. Ignores and filters are applied as usual.