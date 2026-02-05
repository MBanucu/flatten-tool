import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { flattenDirectory } from '../src/flatten.ts';

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

test('flattens a simple nested directory with move', async () => {
  await mkdir(join(sourceDir, 'subdir'));
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'subdir', 'file2.txt'), 'content2');

  await flattenDirectory(sourceDir, targetDir, {
    move: true,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: true,
  });

  const targetFiles = await readdir(targetDir);
  expect(targetFiles.sort()).toEqual(['file1.txt', 'subdir_file2.txt']);

  await expect(stat(join(sourceDir, 'subdir'))).rejects.toThrow();
  const sourceFiles = await readdir(sourceDir);
  expect(sourceFiles).toEqual([]);
});

test('handles filename conflicts with move', async () => {
  await mkdir(join(sourceDir, 'subdir'));
  await writeFile(join(sourceDir, 'file.txt'), 'content1');
  await writeFile(join(sourceDir, 'subdir', 'file.txt'), 'content2');

  await flattenDirectory(sourceDir, targetDir, {
    move: true,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: true,
  });

  const targetFiles = await readdir(targetDir);
  expect(targetFiles.sort()).toEqual(['file.txt', 'subdir_file.txt']);
});

test('copies files by default without move', async () => {
  await mkdir(join(sourceDir, 'subdir'));
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'subdir', 'file2.txt'), 'content2');

  await flattenDirectory(sourceDir, targetDir, {
    move: false,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: true,
  });

  const targetFiles = await readdir(targetDir);
  expect(targetFiles.sort()).toEqual(['file1.txt', 'subdir_file2.txt']);

  const sourceFiles = await readdir(sourceDir);
  expect(sourceFiles.sort()).toEqual(['file1.txt', 'subdir']);
  const subFiles = await readdir(join(sourceDir, 'subdir'));
  expect(subFiles).toEqual(['file2.txt']);
});

test('ignores files matching custom patterns with move', async () => {
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
  });

  const targetFiles = await readdir(targetDir);
  expect(targetFiles.sort()).toEqual(['file1.txt', 'subdir_file2.txt']);

  const sourceFiles = await readdir(sourceDir);
  expect(sourceFiles).toEqual(['ignore.txt']);
});

test('ignores files from .gitignore by default with move', async () => {
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
  });

  const targetFiles = await readdir(targetDir);
  expect(targetFiles.sort()).toEqual(['.gitignore', 'file1.txt', 'subdir_file2.txt']);

  const sourceFiles = await readdir(sourceDir);
  expect(sourceFiles).toEqual(['ignore.txt']);
});

test('ignores files from .gitignore in subdirectories with move', async () => {
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
  });

  const targetFiles = await readdir(targetDir);
  expect(targetFiles.sort()).toEqual(['file1.txt', 'subdir_.gitignore', 'subdir_file2.txt']);

  const sourceFiles = await readdir(sourceDir);
  expect(sourceFiles).toEqual(['subdir']);
  const subFiles = await readdir(join(sourceDir, 'subdir'));
  expect(subFiles).toEqual(['ignore_in_sub.txt']);
});

test('escapes underscores in path components with move', async () => {
  await mkdir(join(sourceDir, 'sub_dir'));
  await writeFile(join(sourceDir, 'file_1.txt'), 'content1');
  await writeFile(join(sourceDir, 'sub_dir', 'file_2.txt'), 'content2');

  await flattenDirectory(sourceDir, targetDir, {
    move: true,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: true,
  });

  const targetFiles = await readdir(targetDir);
  expect(targetFiles.sort()).toEqual(['file__1.txt', 'sub__dir_file__2.txt']);
});

test('does not ignore files from .gitignore when respectGitignore is false', async () => {
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
  });

  const targetFiles = await readdir(targetDir);
  expect(targetFiles.sort()).toEqual(['.gitignore', 'file1.txt', 'ignore.txt', 'subdir_file2.txt']);
});

test('includes binary files like GIF when flattening to directory', async () => {
  await writeFile(join(sourceDir, 'file1.txt'), 'content1');
  await writeFile(join(sourceDir, 'image.gif'), 'fake gif content');

  await flattenDirectory(sourceDir, targetDir, {
    move: false,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: true,
  });

  const targetFiles = await readdir(targetDir);
  expect(targetFiles.sort()).toEqual(['file1.txt', 'image.gif']);
});

test('overwrites existing files in target directory with overwrite', async () => {
  await writeFile(join(sourceDir, 'file.txt'), 'new content');
  await writeFile(join(targetDir, 'file.txt'), 'existing');

  await flattenDirectory(sourceDir, targetDir, {
    move: false,
    overwrite: true,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: true,
  });

  const content = await readFile(join(targetDir, 'file.txt'), 'utf8');
  expect(content).toBe('new content');
});

test('throws error on target file conflict without overwrite', async () => {
  await writeFile(join(sourceDir, 'file.txt'), 'new content');
  await writeFile(join(targetDir, 'file.txt'), 'existing');

  await expect(
    flattenDirectory(sourceDir, targetDir, {
      move: false,
      overwrite: false,
      ignorePatterns: [],
      respectGitignore: true,
      flattenToDirectory: true,
    })
  ).rejects.toThrowError(/already exists/);
});

test('skips operation when source and target are the same', async () => {
  await writeFile(join(sourceDir, 'file.txt'), 'content');

  await flattenDirectory(sourceDir, sourceDir, {
    move: false,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: true,
  });

  const files = await readdir(sourceDir);
  expect(files).toEqual(['file.txt']);
});

test('throws error when source directory does not exist', async () => {
  const nonExistentSource = join(tempDir, 'nonexistent');

  await expect(
    flattenDirectory(nonExistentSource, targetDir, {
      move: false,
      overwrite: false,
      ignorePatterns: [],
      respectGitignore: true,
      flattenToDirectory: true,
    })
  ).rejects.toThrowError(/does not exist/);
});

test('handles empty source directory', async () => {
  await flattenDirectory(sourceDir, targetDir, {
    move: false,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: true,
  });

  const targetFiles = await readdir(targetDir);
  expect(targetFiles).toEqual([]);
});

test('handles deep directory nesting with move', async () => {
  await mkdir(join(sourceDir, 'a/b/c'), { recursive: true });
  await writeFile(join(sourceDir, 'a/b/c/file.txt'), 'content');

  await flattenDirectory(sourceDir, targetDir, {
    move: true,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: true,
  });

  const targetFiles = await readdir(targetDir);
  expect(targetFiles).toEqual(['a_b_c_file.txt']);
  const sourceFiles = await readdir(sourceDir);
  expect(sourceFiles).toEqual([]);
});

test('handles special characters in filenames', async () => {
  await writeFile(join(sourceDir, 'file@#$.txt'), 'content');

  await flattenDirectory(sourceDir, targetDir, {
    move: false,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: true,
  });

  const targetFiles = await readdir(targetDir);
  expect(targetFiles).toEqual(['file@#$.txt']);
});

test('handles multiple binary file types', async () => {
  await writeFile(join(sourceDir, 'doc.pdf'), 'pdf content');
  await writeFile(join(sourceDir, 'archive.zip'), 'zip content');
  await writeFile(join(sourceDir, 'text.txt'), 'text content');

  await flattenDirectory(sourceDir, targetDir, {
    move: false,
    overwrite: false,
    ignorePatterns: [],
    respectGitignore: true,
    flattenToDirectory: true,
  });

  const targetFiles = await readdir(targetDir);
  expect(targetFiles.sort()).toEqual(['archive.zip', 'doc.pdf', 'text.txt']);
});
