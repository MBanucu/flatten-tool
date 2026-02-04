#!/usr/bin/env bun
import { join } from 'node:path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import pkg from './package.json' assert { type: 'json' };
import { flattenDirectory } from './src/flatten.ts';

export { flattenDirectory };

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
      const source = argv.source as string;
      let target = argv.target as string;
      const move = argv.move as boolean;
      const overwrite = argv.overwrite as boolean;
      const ignorePatterns = argv.ignore as string[];
      const respectGitignore = argv.gitignore as boolean;
      const flattenToDirectory = argv.directory as boolean;

      if (!target) {
        target = flattenToDirectory 
          ? join(process.cwd(), 'flattened')
          : join(process.cwd(), 'flattened.md');
      }

      await flattenDirectory(source, target, { move, overwrite, ignorePatterns, respectGitignore, flattenToDirectory });
      const action = move ? 'moved' : 'copied';
      const mode = flattenToDirectory ? 'directory' : 'Markdown file';
      console.log(`Directory flattened successfully (${action}) into ${target} (${mode}).`);
    })
    .help('h')
    .alias('h', 'help')
    .version(pkg.version ?? '0.0.0')
    .alias('v', 'version')
    .parse();
}