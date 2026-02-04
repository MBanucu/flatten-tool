import { stat, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { globby } from 'globby';
import { flattenToDirectory } from './flattenToDirectory.ts';
import { mergeToMarkdown } from './mergeToMarkdown.ts';
import { removeEmptyDirs } from './utils.ts';

interface FlattenOptions {
  move: boolean;
  overwrite: boolean;
  ignorePatterns: string[];
  respectGitignore: boolean;
  flattenToDirectory: boolean;
}

export async function flattenDirectory(
  source: string,
  target: string,
  options: FlattenOptions
): Promise<void> {
  const absSource = resolve(source);
  const absTarget = resolve(target);

  if (absSource === absTarget) {
    console.log('Source and target are the same; skipping.');
    return;
  }

  try {
    await stat(source);
  } catch {
    throw new Error(`Source directory "${source}" does not exist.`);
  }

  const extraIgnores = options.ignorePatterns.map(pattern => `!${pattern}`);

  const defaultIgnores = ['.git'];
  if (!options.flattenToDirectory) {
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
    gitignore: options.respectGitignore,
    absolute: true,
    dot: true,
    onlyFiles: true,
    ignore: defaultIgnores,
  });

  if (options.flattenToDirectory) {
    await flattenToDirectory(files, absSource, absTarget, options);
  } else {
    await mergeToMarkdown(files, absSource, absTarget, options);
  }

  if (options.move) {
    for (const srcPath of files) {
      await rm(srcPath, { force: true });
    }
    await removeEmptyDirs(absSource, absSource);
  }
}