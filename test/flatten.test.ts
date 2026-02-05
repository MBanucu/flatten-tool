import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { flattenDirectory } from '../index.ts';

let tempDir: string;
let sourceDir: string;
let targetDir: string;

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

  await flattenDirectory(sourceDir, targetDir, {
    move: true,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: true,
  }); // move

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

  await flattenDirectory(sourceDir, targetDir, {
    move: true,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: true,
  }); // move

  const targetFiles = await readdir(targetDir);
  expect(targetFiles.sort()).toEqual(['file.txt', 'subdir_file.txt']);
});

test('copies files by default', async () => {
  await mkdir(join(sourceDir, 'subdir'));
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'subdir', 'file2.txt'), 'content2');

  await flattenDirectory(sourceDir, targetDir, {
    move: false,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: true,
  }); // copy

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

  await flattenDirectory(sourceDir, targetDir, {
    move: true,
    overwrite: false,
    ignorePatterns: ['ignore.txt'],
    respectGitignore: true,
    flattenToDirectory: true,
  }); // move, ignore specific file

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

  await flattenDirectory(sourceDir, targetDir, {
    move: true,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: true,
  }); // move, should ignore from .gitignore

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

  await flattenDirectory(sourceDir, targetDir, {
    move: true,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: true,
  }); // move

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

  await flattenDirectory(sourceDir, targetDir, {
    move: true,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: true,
  }); // move

  const targetFiles = await readdir(targetDir);
  expect(targetFiles.sort()).toEqual(['file__1.txt', 'sub__dir_file__2.txt']);
});

test('does not ignore files from .gitignore when respectGitignore=false', async () => {
  await mkdir(join(sourceDir, 'subdir'));
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'subdir', 'file2.txt'), 'content2');
  await writeFile(join(sourceDir, 'ignore.txt'), 'ignored');
  await writeFile(join(sourceDir, '.gitignore'), 'ignore.txt\n');

  await flattenDirectory(sourceDir, targetDir, {
    move: true,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: false,
    flattenToDirectory: true,
  }); // respectGitignore = false

  const targetFiles = await readdir(targetDir);
  expect(targetFiles.sort()).toEqual(['.gitignore', 'file1.txt', 'ignore.txt', 'subdir_file2.txt']);
});

test('merges files into a single md file', async () => {
  await mkdir(join(sourceDir, 'subdir'));
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'subdir', 'file2.js'), 'content2');

  const mdTarget = join(tempDir, 'output.md');
  await flattenDirectory(sourceDir, mdTarget, {
    move: false,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: false,
  }); // copy, mergeMd

  const mdContent = await readFile(mdTarget, 'utf8');
  expect(mdContent).toMatchSnapshot();

  // Source files still exist since copy
  expect(await readdir(sourceDir)).toContain('file1.txt');
});

test('handles md files with nested code blocks correctly', async () => {
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

  const mdTarget = join(tempDir, 'output.md');
  await flattenDirectory(sourceDir, mdTarget, {
    move: false,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: false,
  }); // merge to md

  const mdContent = await readFile(mdTarget, 'utf8');
  expect(mdContent).toMatchSnapshot();
});

test('merges files into md with move', async () => {
  await mkdir(join(sourceDir, 'subdir'));
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'subdir', 'file2.js'), 'content2');

  const mdTarget = join(tempDir, 'output.md');
  await flattenDirectory(sourceDir, mdTarget, {
    move: true,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: false,
  }); // move, mergeMd

  const mdContent = await readFile(mdTarget, 'utf8');
  expect(mdContent).toMatchSnapshot();

  // Source files deleted, subdir empty and removed
  const sourceFiles = await readdir(sourceDir);
  expect(sourceFiles).toEqual([]);
});

test('handles md target conflict without overwrite', async () => {
  await writeFile(join(sourceDir, 'file.txt'), 'content');
  const mdTarget = join(tempDir, 'output.md');
  await writeFile(mdTarget, 'existing');

  try {
    await flattenDirectory(sourceDir, mdTarget, {
      move: false,
      overwrite: false,
      ignorePatterns: [],
      respectGitignore: true,
      flattenToDirectory: false,
    });
    throw new Error('should have thrown');
  } catch (e) {
    expect((e as Error).message).toContain('already exists');
  }
});

test('overwrites md target with overwrite', async () => {
  await writeFile(join(sourceDir, 'file.txt'), 'new content');
  const mdTarget = join(tempDir, 'output.md');
  await writeFile(mdTarget, 'existing');

  await flattenDirectory(sourceDir, mdTarget, {
    move: false,
    overwrite: true,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: false,
  }); // overwrite

  const mdContent = await readFile(mdTarget, 'utf8');
  expect(mdContent).toContain('new content');
  expect(mdContent).not.toContain('existing');
});

test('ignores files when merging to md', async () => {
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'ignore.txt'), 'ignored');
  await writeFile(join(sourceDir, '.gitignore'), 'ignore.txt');

  const mdTarget = join(tempDir, 'output.md');
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

test('excludes gif files by default when merging to md', async () => {
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'image.gif'), 'fake gif content');

  const mdTarget = join(tempDir, 'output.md');
  await flattenDirectory(sourceDir, mdTarget, {
    move: false,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: false,
  }); // merge to md

  const mdContent = await readFile(mdTarget, 'utf8');
  expect(mdContent).toMatchSnapshot();
});

test('includes gif files when flattening to directory', async () => {
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'image.gif'), 'fake gif content');

  await flattenDirectory(sourceDir, targetDir, {
    move: false,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: true,
  }); // flatten to directory

  const targetFiles = await readdir(targetDir);
  expect(targetFiles.sort()).toEqual(['file1.txt', 'image.gif']);
});

test('excludes gif files in subdirs by default when merging to md', async () => {
  await mkdir(join(sourceDir, 'subdir'));
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'subdir', 'file2.js'), 'content2');
  await writeFile(join(sourceDir, 'subdir', 'image.gif'), 'fake gif content');

  const mdTarget = join(tempDir, 'output.md');
  await flattenDirectory(sourceDir, mdTarget, {
    move: false,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: false,
  }); // merge to md

  const mdContent = await readFile(mdTarget, 'utf8');
  expect(mdContent).toMatchSnapshot();
});
