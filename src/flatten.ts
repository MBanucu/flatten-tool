import { rm, stat } from 'node:fs/promises';
import { resolve, join, relative, sep } from 'node:path';
import { globby } from 'globby';
import { flattenToDirectory } from './flattenToDirectory.ts';
import { mergeToMarkdown } from './mergeToMarkdown.ts';
import { removeEmptyDirs, escapePathComponent } from './utils.ts';

interface FlattenOptions {
  move: boolean;
  overwrite: boolean;
  ignorePatterns: string[];
  respectGitignore: boolean;
  flattenToDirectory: boolean;
  verbose?: boolean;
  dryRun?: boolean;
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

  const defaultIgnores = ['.git'];
  if (!options.flattenToDirectory) {
    const binaryExts = [
      'gif',
      'png',
      'jpg',
      'jpeg',
      'webp',
      'svg',
      'bmp',
      'ico',
      'pdf',
      'zip',
      'tar',
      'gz',
      'xz',
      '7z',
      'mp3',
      'mp4',
      'webm',
      'ogg',
      'wav',
      'exe',
      'dll',
      'so',
      'dylib',
      'bin',
    ];
    defaultIgnores.push(`**/*.{${binaryExts.join(',')}}`);
  }

  const ignoreList = [...defaultIgnores, ...options.ignorePatterns, absTarget];

  const verbose = options.verbose ?? false;
  const dryRun = options.dryRun ?? false;

  if (verbose) {
    console.log(`Searching recursively from: ${absSource}`);
    const dirs = await globby(['**'], {
      cwd: absSource,
      gitignore: options.respectGitignore,
      absolute: true,
      dot: true,
      onlyDirectories: true,
      ignore: ignoreList,
    });
    console.log('Directories searched:');
    dirs.sort().forEach((dir) => {
      console.log(dir);
    });
  }

  const files = await globby(['**'], {
    cwd: absSource,
    gitignore: options.respectGitignore,
    absolute: true,
    dot: true,
    onlyFiles: true,
    ignore: ignoreList,
  });

  if (dryRun) {
    console.log(`Dry run mode: Previewing operations (no changes will be made)`);
    console.log(`Would process ${files.length} files from ${absSource} to ${absTarget}`);
    if (files.length === 0) {
      console.log('No files match the criteria.');
      return;
    }

    files.forEach((srcPath) => {
      const relPath = relative(absSource, srcPath);
      let tgtPath: string;
      if (options.flattenToDirectory) {
        const components = relPath.split(sep);
        const escapedComponents = components.map(escapePathComponent);
        tgtPath = join(absTarget, escapedComponents.join('_'));
      } else {
        tgtPath = absTarget; // Merged into single file
      }
      const action = options.move ? 'Move' : 'Copy';
      console.log(`${action}: ${srcPath} -> ${tgtPath}`);
    });

    if (options.move) {
      console.log('Would remove original files and clean up empty directories.');
    }
    if (!options.flattenToDirectory) {
      console.log(`Would merge contents into Markdown file: ${absTarget}`);
    }
    return;
  }

  // Existing code continues here (actual flattening)...
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
