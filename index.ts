#!/usr/bin/env bun

import { copyFile, rename, rm, stat, mkdir, readdir, rmdir } from 'node:fs/promises';
import { join, relative, sep, resolve } from 'node:path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { globby } from 'globby';

function escapePathComponent(component: string): string {
  return component.replace(/_/g, '__');
}

async function removeEmptyDirs(dir: string, root?: string): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await removeEmptyDirs(join(dir, entry.name), root);
    }
  }
  if (dir !== root) {
    try {
      await rmdir(dir);
    } catch {
      // Not empty, skip
    }
  }
}

export async function flattenDirectory(
  source: string,
  target: string,
  move: boolean = false,
  overwrite: boolean = false,
  ignorePatterns: string[] = [],
  respectGitignore: boolean = true
): Promise<void> {
  const absSource = resolve(source);
  const absTarget = resolve(target);

  if (absSource === absTarget) {
    console.log('Source and target are the same; skipping.');
    return;
  }

  await mkdir(absTarget, { recursive: true });

  // Prepare negative patterns for additional ignores (e.g., '!*.log')
  const negativeIgnores = ignorePatterns.map(pattern => `!${pattern}`);

  // Get all non-ignored files (respects .gitignore in the tree if enabled)
  const files = await globby(['**', ...negativeIgnores], {
    cwd: absSource,
    gitignore: respectGitignore,
    absolute: true,
    dot: true, // Include dotfiles unless ignored
    onlyFiles: true, // Only files, not dirs
    ignore: ['.git'], // Always ignore .git directory
  });

  for (const srcPath of files) {
    const relPath = relative(absSource, srcPath);
    const components = relPath.split(sep);
    const escapedComponents = components.map(escapePathComponent);
    const newName = escapedComponents.join('_');
    const tgtPath = join(absTarget, newName);

    // Check for conflicts
    try {
      await stat(tgtPath);
      if (!overwrite) {
        throw new Error(`Target file "${tgtPath}" already exists. Use --overwrite to force.`);
      }
      console.warn(`Overwriting existing file: ${tgtPath}`);
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }

    if (move) {
      await rename(srcPath, tgtPath);
    } else {
      await copyFile(srcPath, tgtPath);
    }
  }

  if (move) {
    // Clean up empty directories in source
    await removeEmptyDirs(absSource, absSource);
  }
}

// Main CLI logic
if (import.meta.url === `file://${process.argv[1]}`) {
  yargs(hideBin(process.argv))
    .command('$0 <source> [target]', 'Flatten a directory structure (default: copy)', (yargs) => {
      yargs
        .positional('source', {
          describe: 'The directory to flatten',
          type: 'string',
          demandOption: true,
        })
        .positional('target', {
          describe: 'Where to place the flattened files (default: current directory)',
          type: 'string',
          default: process.cwd(),
        })
        .option('move', {
          alias: 'm',
          describe: 'Move files instead of copying (original files will be deleted)',
          type: 'boolean',
          default: false,
        })
        .option('overwrite', {
          alias: 'o',
          describe: 'Overwrite existing files in target if conflicts occur',
          type: 'boolean',
          default: false,
        })
        .option('gitignore', {
          alias: 'g',
          describe: 'Respect .gitignore files (default: true). Use --no-gitignore to include everything',
          type: 'boolean',
          default: true,
        })
    }, async (argv) => {
      const source: string = argv.source as string;
      const target: string = argv.target as string;
      const move: boolean = argv.move as boolean;
      const overwrite: boolean = argv.overwrite as boolean;
      const ignorePatterns: string[] = argv.ignore as string[];
      const respectGitignore: boolean = argv.gitignore as boolean;

      try {
        await stat(source);
      } catch {
        console.error(`Source directory "${source}" does not exist.`);
        process.exit(1);
      }

      const action = move ? 'moved' : 'copied';
      await flattenDirectory(source, target, move, overwrite, ignorePatterns, respectGitignore);
      console.log(`Directory flattened successfully (${action}) into ${target}.`);
    })
    .help('h')
    .alias('h', 'help')
    .version('1.1.0')
    .alias('v', 'version')
    .parse();
}