#!/usr/bin/env bun
import { copyFile, rename, rm, stat, mkdir, readdir, rmdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep, resolve, extname } from 'node:path';
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline, finished } from 'node:stream/promises';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { globby } from 'globby';
import pkg from './package.json' assert { type: 'json' };
import GithubSlugger from 'github-slugger';

function escapePathComponent(component: string): string {
  return component.replace(/_/g, '__');
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

  // Patterns explicitly ignored (in addition to .gitignore when enabled)
  const extraIgnores = ignorePatterns.map(pattern => `!${pattern}`);

  const defaultIgnores = ['.git'];
  if (!flattenToDirectory) {
    // Common binary/media extensions that would corrupt UTF-8 text output
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
    gitignore: respectGitignore,
    absolute: true,
    dot: true,
    onlyFiles: true,
    ignore: defaultIgnores,
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

    const fileEntries = files.map(srcPath => ({
      srcPath,
      relPath: relative(absSource, srcPath).replace(/\\/g, '/')
    }));

    const relPaths = fileEntries.map(e => e.relPath);
    const treeObj = buildTreeObject(relPaths);

    // Map for quick lookup of srcPath by relPath
    const pathMap = new Map<string, string>();
    fileEntries.forEach(({ srcPath, relPath }) => {
      pathMap.set(relPath, srcPath);
    });

    // === NEW: Precompute anchors in document order ===
    interface Section {
      path: string;
      headerText: string;
    }

    const sections: Section[] = [];

    function collectSections(node: any, currentPath: string): void {
      const dirs: { name: string; child: any }[] = [];
      const files: { relPath: string }[] = [];

      for (const [key, value] of Object.entries(node) as [string, any][]) {
        if (key.endsWith('/')) {
          const name = key.slice(0, -1);
          dirs.push({ name, child: value });
        } else {
          files.push({ relPath: value as string });
        }
      }

      dirs.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      files.sort((a, b) => a.relPath.toLowerCase().localeCompare(b.relPath.toLowerCase()));

      for (const dir of dirs) {
        const newPath = currentPath ? `${currentPath}/${dir.name}` : dir.name;
        collectSections(dir.child, newPath);
      }

      if (currentPath) {
        sections.push({ path: currentPath, headerText: currentPath }); // no trailing /
      }

      for (const file of files) {
        sections.push({ path: file.relPath, headerText: file.relPath });
      }
    }

    sections.push({ path: '', headerText: 'Project File Tree' });

    collectSections(treeObj, '');

    const anchorMap = new Map<string, string>();
    const anchorSlugger = new GithubSlugger();
    for (const sec of sections) {
      anchorMap.set(sec.path, anchorSlugger.slug(sec.headerText));
    }
    // === END NEW ===

    // Updated renderMarkdownTree to use precomputed anchors
    function renderMarkdownTree(
      node: any,
      depth: number = 0,
      prefix: string = '',
      anchorMap: Map<string, string>,
      parentPath: string | null  // null for global root (no ..)
    ): string {
      let result = '';
      const indent = '  '.repeat(depth);

      // Add .. if we have a parent
      if (parentPath !== null && depth === 0) {
        const parentAnchor = anchorMap.get(parentPath) ?? '';
        result += `${indent}- [..](#${parentAnchor})\n`;
      }

      // Determine indentation for direct children
      const entryIndent = '  '.repeat(depth);

      const entries: [string, any][] = Object.entries(node);

      entries.sort(([a], [b]) => {
        const aDir = a.endsWith('/');
        const bDir = b.endsWith('/');
        if (aDir !== bDir) return aDir ? -1 : 1;
        return a.toLowerCase().localeCompare(b.toLowerCase());
      });

      for (const [key, value] of entries) {
        const isDir = key.endsWith('/');
        const name = isDir ? key.slice(0, -1) : key;
        const display = isDir ? name + '/' : name;
        const pathHere = prefix ? `${prefix}/${name}` : name;
        const anchor = anchorMap.get(pathHere) ?? '';

        result += `${entryIndent}- [${display}](#${anchor})\n`;

        if (isDir) {
          // Recurse with increased depth; child's parent is current prefix
          result += renderMarkdownTree(
            value,
            depth + 1,
            pathHere,
            anchorMap,
            prefix
          );
        }
      }

      return result;
    }

    // Render global tree with correct anchors
    let treeMarkdown = `<a id="${anchorMap.get('')!}"></a>\n# Project File Tree\n\n`;
    treeMarkdown += renderMarkdownTree(treeObj, 0, '', anchorMap, null);
    treeMarkdown += "\n\n";

    const writeStream = createWriteStream(absTarget);
    writeStream.setMaxListeners(0);
    writeStream.write(treeMarkdown);

    async function writeContentRecursive(
      node: any,
      currentPath: string,
      writeStream: import('node:fs').WriteStream,
      pathMap: Map<string, string>
    ): Promise<void> {
      const dirs: { name: string; child: any }[] = [];
      const files: { name: string; relPath: string; srcPath: string }[] = [];

      for (const [key, value] of Object.entries(node) as [string, any][]) {
        if (key.endsWith('/')) {
          const name = key.slice(0, -1);
          dirs.push({ name, child: value });
        } else {
          const relPath = value as string;
          const srcPath = pathMap.get(relPath)!;
          const name = key;
          files.push({ name, relPath, srcPath });
        }
      }

      dirs.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      files.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

      for (const dir of dirs) {
        const newPath = currentPath ? `${currentPath}/${dir.name}` : dir.name;
        await writeContentRecursive(dir.child, newPath, writeStream, pathMap);
      }

      // Directory section (only for non-root) — no trailing /
      if (currentPath) {
        const anchor = anchorMap.get(currentPath)!;
        writeStream.write(`<a id="${anchor}"></a>\n# ${currentPath}\n\n`);
        writeStream.write(`File Tree\n\n`);

        const parentPath = currentPath.includes('/')
          ? currentPath.slice(0, currentPath.lastIndexOf('/'))
          : '';

        writeStream.write(renderMarkdownTree(node, 0, currentPath, anchorMap, parentPath));
        writeStream.write('\n');
      }

      for (const file of files) {
        const anchor = anchorMap.get(file.relPath)!;
        writeStream.write(`<a id="${anchor}"></a>\n# ${file.relPath}\n\n`);

        let ext = extname(file.srcPath).slice(1) || 'text';
        const lang = ext;
        const isMd = ['md', 'markdown'].includes(ext.toLowerCase());
        const ticks = isMd ? '````' : '```';

        writeStream.write(`${ticks}${lang}\n`);

        const readStream = createReadStream(file.srcPath, { encoding: 'utf8' });
        await pipeline(readStream, writeStream, { end: false });

        writeStream.write(`\n${ticks}\n\n`);
      }
    }

    await writeContentRecursive(treeObj, '', writeStream, pathMap);

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
        .option('ignore', {
          alias: 'i',
          type: 'string',
          array: true,
          describe: 'Additional glob patterns to ignore (e.g. "*.log" "temp/**")',
          default: [],
        })
    }, async (argv) => {
      let source = argv.source as string;           // now always defined (default '.')
      let target = argv.target as string;           // may be undefined

      const move: boolean = argv.move as boolean;
      const overwrite: boolean = argv.overwrite as boolean;
      const ignorePatterns: string[] = (argv.ignore as string[] | undefined) ?? [];
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