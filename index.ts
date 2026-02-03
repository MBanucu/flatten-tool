#!/usr/bin/env bun

import { readdir, rename, rmdir, stat, mkdir, copyFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { Dirent } from 'node:fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { minimatch } from 'minimatch';

function escapePathComponent(component: string): string {
  return component.replace(/_/g, '__');
}

export async function flattenDirectory(
  rootSource: string,
  source: string,
  target: string,
  move: boolean = false,
  ignorePatterns: string[] = []
): Promise<void> {
  try {
    await mkdir(target, { recursive: true });
    const entries: Dirent[] = await readdir(source, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath: string = join(source, entry.name);

      // Skip if source path is the same as target (prevent self-copy/move issues)
      if (srcPath === target) continue;

      // Compute relative path for ignore check
      const relPath: string = relative(rootSource, srcPath);

      // Skip if matches any ignore pattern
      if (ignorePatterns.some(pattern => minimatch(relPath, pattern))) continue;

      if (entry.isDirectory()) {
        await flattenDirectory(rootSource, srcPath, target, move, ignorePatterns);
        // Remove empty subdirectory after processing (safe for both copy and move)
        await rmdir(srcPath).catch(() => {});
      } else {
        // Compute flattened name with escaped underscores
        const components: string[] = relPath.split(sep);
        const escapedComponents: string[] = components.map(escapePathComponent);
        const newName: string = escapedComponents.join('_');

        const tgtPath: string = join(target, newName);

        if (move) {
          await rename(srcPath, tgtPath);
        } else {
          await copyFile(srcPath, tgtPath);
        }
      }
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`Error flattening ${source}: ${err.message}`);
    process.exit(1);
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
        .option('ignore', {
          alias: 'i',
          describe: 'Glob patterns to ignore (repeat --ignore for multiple, e.g., --ignore "*.log" --ignore "temp/*")',
          type: 'array',
          default: [],
        });
    }, async (argv) => {
      const source: string = argv.source as string;
      const target: string = argv.target as string;
      const move: boolean = argv.move as boolean;
      const ignorePatterns: string[] = argv.ignore as string[];

      await stat(source).catch(() => {
        console.error(`Source directory "${source}" does not exist.`);
        process.exit(1);
      });

      const action = move ? 'moved' : 'copied';
      await flattenDirectory(source, source, target, move, ignorePatterns);
      console.log(`Directory flattened successfully (${action}) into ${target}.`);
    })
    .help('h')
    .alias('h', 'help')
    .version('1.0.0')
    .alias('v', 'version')
    .parse();
}