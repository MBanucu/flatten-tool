import { copyFile, rename, rm, stat, mkdir, readdir, rmdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep, resolve, extname } from 'node:path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { globby } from 'globby';
import pkg from './package.json' assert { type: 'json' };

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

  const files = await globby(['**', ...negativeIgnores], {
    cwd: absSource,
    gitignore: respectGitignore,
    absolute: true,
    dot: true,
    onlyFiles: true,
    ignore: ['.git'],
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

    let mdContent = '';
    for (const srcPath of files) {
      const relPath = relative(absSource, srcPath).replace(/\\/g, '/'); // Normalize to forward slashes
      const content = await readFile(srcPath, 'utf8');
      let ext = extname(srcPath).slice(1) || 'text';
      const isMd = ['md', 'markdown'].includes(ext.toLowerCase());
      const ticks = isMd ? '````' : '```';
      mdContent += `# ${relPath}\n\n${ticks}${ext}\n${content}\n${ticks}\n\n`;
    }

    await writeFile(absTarget, mdContent);

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