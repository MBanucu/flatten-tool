#!/usr/bin/env bun
import { copyFile, rename, rm, stat, mkdir, readdir, rmdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep, resolve, extname } from 'node:path';
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline, finished } from 'node:stream/promises';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { globby } from 'globby';
import pkg from './package.json' assert { type: 'json' };

function escapePathComponent(component: string): string {
  return component.replace(/_/g, '__');
}

function generateMarkdownAnchor(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove punctuation except hyphens and underscores
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

function buildTreeObject(relPaths: string[]): any {
  const tree: any = {};
  for (const path of relPaths) {
    const parts = path.split('/');
    let node = tree;
    const currentParts: string[] = [];
    for (const [index, part] of parts.entries()) {
      currentParts.push(part);
      const isDir = index < parts.length - 1;
      const key = isDir ? `${part}/` : part;
      if (node[key] === undefined) {
        node[key] = isDir ? {} : currentParts.join('/');
      }
      if (isDir) {
        node = node[key];
      }
    }
  }
  return tree;
}

function renderMarkdownTree(node: any, depth: number): string {
  let result = '';
  const indent = '  '.repeat(depth);
  const entries: [string, any][] = Object.entries(node);

  entries.sort(([a], [b]) => {
    const aDir = a.endsWith('/');
    const bDir = b.endsWith('/');
    if (aDir !== bDir) return aDir ? -1 : 1;
    return a.toLowerCase().localeCompare(b.toLowerCase());
  });

  for (const [key, value] of entries) {
    const isDir = key.endsWith('/');
    const display = isDir ? key.slice(0, -1) + '/' : key;
    if (isDir) {
      result += `${indent}- ${display}\n`;
      result += renderMarkdownTree(value, depth + 1);
    } else {
      const fullPath = value as string;
      const anchor = generateMarkdownAnchor(fullPath);
      result += `${indent}- [${display}](#${anchor})\n`;
    }
  }
  return result;
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
  respectGitignore: boolean = true,
  flattenToDirectory: boolean = false
): Promise<void> {
  const absSource = resolve(source);
  const absTarget = resolve(target);

  if (absSource === absTarget) {
    console.log('Source and target are the same; skipping.');
    return;
  }

  const negativeIgnores = ignorePatterns.map(pattern => `!${pattern}`);

  const ignoreFiles = ['.git'];
  if (!flattenToDirectory) {
    ignoreFiles.push('**/*.gif');
  }

   const files = await globby(['**', ...negativeIgnores], {
    cwd: absSource,
    gitignore: respectGitignore,
    absolute: true,
    dot: true,
    onlyFiles: true,
    ignore: ignoreFiles,
  });

  if (!flattenToDirectory) {
    // Check if target exists
    try {
      await stat(absTarget);
      if (!overwrite) {
        throw new Error(`Target file "${absTarget}" already exists. Use --overwrite to force.`);
      }
      console.warn(`Overwriting existing file: ${absTarget}`);
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }

    // Sort files for consistent content order
    const fileEntries = files.map(srcPath => ({
      srcPath,
      relPath: relative(absSource, srcPath).replace(/\\/g, '/')
    }));
    fileEntries.sort((a, b) => a.relPath.toLowerCase().localeCompare(b.relPath.toLowerCase()));

    const relPaths = fileEntries.map(e => e.relPath);

    // Build tree structure
    const treeObj = buildTreeObject(relPaths);

    // Render as clickable nested Markdown list
    let treeMarkdown = "# Project File Tree\n\n- .\n";
    treeMarkdown += renderMarkdownTree(treeObj, 1);
    treeMarkdown += "\n";

    const writeStream = createWriteStream(absTarget);
    writeStream.setMaxListeners(0);

    writeStream.write(treeMarkdown);

    // Write file contents (now in sorted order)
    for (const { srcPath, relPath } of fileEntries) {
      let ext = extname(srcPath).slice(1) || 'text';
      const lang = ext;
      const isMd = ['md', 'markdown'].includes(ext.toLowerCase());
      const ticks = isMd ? '````' : '```';

      writeStream.write(`## ${relPath}\n\n${ticks}${lang}\n`);

      const readStream = createReadStream(srcPath, { encoding: 'utf8' });
      await pipeline(readStream, writeStream, { end: false });

      writeStream.write(`\n${ticks}\n\n`);
    }

    // Close the output file and wait for it to finish
    writeStream.end();
    await finished(writeStream);

    if (move) {
      for (const srcPath of files) {
        await rm(srcPath);
      }
      await removeEmptyDirs(absSource, absSource);
    }
  } else {
    await mkdir(absTarget, { recursive: true });

    for (const srcPath of files) {
      const relPath = relative(absSource, srcPath);
      const components = relPath.split(sep);
      const escapedComponents = components.map(escapePathComponent);
      const newName = escapedComponents.join('_');
      const tgtPath = join(absTarget, newName);

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
      await removeEmptyDirs(absSource, absSource);
    }
  }
}

// Main CLI logic
if (import.meta.url === `file://${process.argv[1]}`) {
  yargs(hideBin(process.argv))
    .command('$0 [source] [target]', 'Flatten or merge a directory structure (default source: current directory)', (yargs) => {
      yargs
        .positional('source', {
          describe: 'Directory to flatten (default: current directory ".")',
          type: 'string',
          default: '.',
        })
        .positional('target', {
          describe: 'Target file or directory. Default: flattened.md or flattened/ depending on --directory',
          type: 'string',
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
        .option('directory', {
          alias: 'd',
          describe: 'Flatten files into a directory structure (escaped filenames). When not set, merges everything into a single Markdown file (default behavior).',
          type: 'boolean',
          default: false,
        })
    }, async (argv) => {
      let source = argv.source as string;           // now always defined (default '.')
      let target = argv.target as string;           // may be undefined

      const move: boolean = argv.move as boolean;
      const overwrite: boolean = argv.overwrite as boolean;
      const ignorePatterns: string[] = argv.ignore as string[] || [];
      const respectGitignore: boolean = argv.gitignore as boolean;
      const flattenToDirectory: boolean = argv.directory as boolean;

      // If user didn't provide explicit target, choose sensible default
      if (!target) {
        target = flattenToDirectory
          ? join(process.cwd(), 'flattened')
          : join(process.cwd(), 'flattened.md');
      }

      try {
        await stat(source);
      } catch {
        console.error(`Source directory "${source}" does not exist.`);
        process.exit(1);
      }

      const action = move ? 'moved' : 'copied';
      const mode = flattenToDirectory ? 'directory' : 'Markdown file';
      await flattenDirectory(source, target, move, overwrite, ignorePatterns, respectGitignore, flattenToDirectory);
      console.log(`Directory flattened successfully (${action}) into ${target} (${mode}).`);
    })
    .help('h')
    .alias('h', 'help')
    .version(pkg.version ?? '0.0.0')
    .alias('v', 'version')
    .parse();
}