import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { flattenDirectory } from '../src/flatten.ts';

let tempDir: string;
let sourceDir: string;
let mdTarget: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'flatten-test-'));
  sourceDir = join(tempDir, 'source');
  mdTarget = join(tempDir, 'output.md');
  await mkdir(sourceDir, { recursive: true });
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

test('merges files into a single Markdown file without move', async () => {
  await mkdir(join(sourceDir, 'subdir'));
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'subdir', 'file2.js'), 'content2');

  await flattenDirectory(sourceDir, mdTarget, {
    move: false,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: false,
  });

  const mdContent = await readFile(mdTarget, 'utf8');
  expect(mdContent).toMatchSnapshot();

  const sourceFiles = await readdir(sourceDir);
  expect(sourceFiles.sort()).toEqual(['file1.txt', 'subdir']);
});

test('handles Markdown files with nested code blocks correctly', async () => {
  await mkdir(join(sourceDir, 'subdir'));
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(
    join(sourceDir, 'subdir', 'test.md'),
    `# Test Markdown

\`\`\`
normal code
\`\`\`

\`\`\`\`\`
code with 5 ticks
\`\`\`\`\`

Some text.
`
  );

  await flattenDirectory(sourceDir, mdTarget, {
    move: false,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: false,
  });

  const mdContent = await readFile(mdTarget, 'utf8');
  expect(mdContent).toMatchSnapshot();
});

test('merges files into Markdown with move', async () => {
  await mkdir(join(sourceDir, 'subdir'));
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'subdir', 'file2.js'), 'content2');

  await flattenDirectory(sourceDir, mdTarget, {
    move: true,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: false,
  });

  const mdContent = await readFile(mdTarget, 'utf8');
  expect(mdContent).toMatchSnapshot();

  const sourceFiles = await readdir(sourceDir);
  expect(sourceFiles).toEqual([]);
});

test('throws error on Markdown target conflict without overwrite', async () => {
  await writeFile(join(sourceDir, 'file.txt'), 'content');
  await writeFile(mdTarget, 'existing');

  await expect(
    flattenDirectory(sourceDir, mdTarget, {
      move: false,
      overwrite: false,
      ignorePatterns: [],
      respectGitignore: true,
      flattenToDirectory: false,
    })
  ).rejects.toThrowError(/already exists/);
});

test('overwrites Markdown target with overwrite', async () => {
  await writeFile(join(sourceDir, 'file.txt'), 'new content');
  await writeFile(mdTarget, 'existing');

  await flattenDirectory(sourceDir, mdTarget, {
    move: false,
    overwrite: true,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: false,
  });

  const mdContent = await readFile(mdTarget, 'utf8');
  expect(mdContent).toContain('new content');
  expect(mdContent).not.toContain('existing');
});

test('ignores files when merging to Markdown with gitignore', async () => {
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'ignore.txt'), 'ignored');
  await writeFile(join(sourceDir, '.gitignore'), 'ignore.txt');

  await flattenDirectory(sourceDir, mdTarget, {
    move: false,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: false,
  });

  const mdContent = await readFile(mdTarget, 'utf8');
  expect(mdContent).toMatchSnapshot();
});

test('excludes GIF files by default when merging to Markdown', async () => {
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'image.gif'), 'fake gif content');

  await flattenDirectory(sourceDir, mdTarget, {
    move: false,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: false,
  });

  const mdContent = await readFile(mdTarget, 'utf8');
  expect(mdContent).toMatchSnapshot();
});

test('excludes GIF files in subdirs by default when merging to Markdown', async () => {
  await mkdir(join(sourceDir, 'subdir'));
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'subdir', 'file2.js'), 'content2');
  await writeFile(join(sourceDir, 'subdir', 'image.gif'), 'fake gif content');

  await flattenDirectory(sourceDir, mdTarget, {
    move: false,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: false,
  });

  const mdContent = await readFile(mdTarget, 'utf8');
  expect(mdContent).toMatchSnapshot();
});

test('handles empty source directory', async () => {
  await flattenDirectory(sourceDir, mdTarget, {
    move: false,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: false,
  });

  const mdContent = await readFile(mdTarget, 'utf8');
  expect(mdContent).toMatchSnapshot(); // Should be minimal tree with no files
});

test('handles single file', async () => {
  await writeFile(join(sourceDir, 'file.txt'), 'content');

  await flattenDirectory(sourceDir, mdTarget, {
    move: false,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: false,
  });

  const mdContent = await readFile(mdTarget, 'utf8');
  expect(mdContent).toMatchSnapshot();
});

test('excludes multiple binary types by default', async () => {
  await writeFile(join(sourceDir, 'doc.pdf'), 'pdf content');
  await writeFile(join(sourceDir, 'archive.zip'), 'zip content');
  await writeFile(join(sourceDir, 'text.txt'), 'text content');

  await flattenDirectory(sourceDir, mdTarget, {
    move: false,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: false,
  });

  const mdContent = await readFile(mdTarget, 'utf8');
  expect(mdContent).toContain('text.txt'); // Included
  expect(mdContent).not.toContain('doc.pdf'); // Excluded
  expect(mdContent).not.toContain('archive.zip'); // Excluded
});

test('ignores the destination file when it exists in source directory', async () => {
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'output.md'), 'existing md content');

  const mdTargetInSource = join(sourceDir, 'output.md');

  await flattenDirectory(sourceDir, mdTargetInSource, {
    move: false,
    overwrite: true,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: false,
  });

  const mdContent = await readFile(mdTargetInSource, 'utf8');
  expect(mdContent).toContain('file1.txt');
  expect(mdContent).toContain('content1');
  expect(mdContent).not.toContain('existing md content');
  expect(mdContent).not.toContain('output.md');
});

test('verbose mode logs directories searched', async () => {
  await mkdir(join(sourceDir, 'subdir'));
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');

  const consoleSpy = spyOn(console, 'log');

  await flattenDirectory(sourceDir, mdTarget, {
    move: false,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: false,
    verbose: true,
  });

  expect(consoleSpy).toHaveBeenCalledWith(`Searching recursively from: ${sourceDir}`);
  expect(consoleSpy).toHaveBeenCalledWith('Directories searched:');
  // The subdir should be logged
  expect(consoleSpy).toHaveBeenCalledWith(join(sourceDir, 'subdir'));
});

test('previews merge to Markdown with dry-run without modifying files', async () => {
  await mkdir(join(sourceDir, 'subdir'));
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'subdir', 'file2.txt'), 'content2');

  const consoleSpy = spyOn(console, 'log');
  await flattenDirectory(sourceDir, mdTarget, {
    move: false,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: false,
    dryRun: true,
  });

  expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Dry run mode'));
  expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Would process 2 files'));
  expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Copy:'));
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining('Would merge contents into Markdown file')
  );

  // Assert no changes
  const sourceFiles = await readdir(sourceDir);
  expect(sourceFiles.sort()).toEqual(['file1.txt', 'subdir']);
  await expect(readFile(mdTarget, 'utf8')).rejects.toThrow(); // File should not exist
});
