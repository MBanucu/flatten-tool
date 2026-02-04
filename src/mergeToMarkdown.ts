import { createReadStream, createWriteStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, relative } from 'node:path';
import { finished, pipeline } from 'node:stream/promises';
import GithubSlugger from 'github-slugger';
import { renderMarkdownTree } from './mdRenderer.ts';
import { buildTreeObject } from './treeBuilder.ts';

interface MergeOptions {
  overwrite: boolean;
}

export async function mergeToMarkdown(
  files: string[],
  absSource: string,
  absTarget: string,
  options: MergeOptions
): Promise<void> {
  try {
    await stat(absTarget);
    if (!options.overwrite) {
      throw new Error(`Target file "${absTarget}" already exists. Use --overwrite to force.`);
    }
    console.warn(`Overwriting existing file: ${absTarget}`);
  } catch (err: any) {
    if (err.code !== 'ENOENT') throw err;
  }

  const fileEntries = files.map((srcPath) => ({
    srcPath,
    relPath: relative(absSource, srcPath).replace(/\\/g, '/'),
  }));

  const relPaths = fileEntries.map((e) => e.relPath);
  const treeObj = buildTreeObject(relPaths);

  const pathMap = new Map<string, string>();
  fileEntries.forEach(({ srcPath, relPath }) => {
    pathMap.set(relPath, srcPath);
  });

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
      sections.push({ path: currentPath, headerText: currentPath });
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

  const writeStream = createWriteStream(absTarget);
  writeStream.setMaxListeners(0);

  let treeMarkdown = `<a id="${anchorMap.get('')!}"></a>\n# Project File Tree\n\n`;
  treeMarkdown += renderMarkdownTree(treeObj, 0, '', anchorMap, null);
  treeMarkdown += '\n\n';

  writeStream.write(treeMarkdown);

  async function writeContentRecursive(
    node: any,
    currentPath: string,
    writeStream: import('node:fs').WriteStream,
    pathMap: Map<string, string>,
    anchorMap: Map<string, string>
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
      await writeContentRecursive(dir.child, newPath, writeStream, pathMap, anchorMap);
    }

    if (currentPath) {
      const anchor = anchorMap.get(currentPath)!;
      writeStream.write(`<a id="${anchor}"></a>\n# ${currentPath}\n\n`);
      writeStream.write('File Tree\n\n');

      const parentPath = currentPath.includes('/')
        ? currentPath.slice(0, currentPath.lastIndexOf('/'))
        : '';

      writeStream.write(renderMarkdownTree(node, 0, currentPath, anchorMap, parentPath));
      writeStream.write('\n');
    }

    for (const file of files) {
      const anchor = anchorMap.get(file.relPath)!;
      writeStream.write(`<a id="${anchor}"></a>\n# ${file.relPath}\n\n`);

      const ext = extname(file.srcPath).slice(1) || 'text';
      const lang = ext;
      const isMd = ['md', 'markdown'].includes(ext.toLowerCase());
      const ticks = isMd ? '````' : '```';

      writeStream.write(`${ticks}${lang}\n`);

      const readStream = createReadStream(file.srcPath, { encoding: 'utf8' });
      await pipeline(readStream, writeStream, { end: false });

      writeStream.write(`\n${ticks}\n\n`);
    }
  }

  await writeContentRecursive(treeObj, '', writeStream, pathMap, anchorMap);

  writeStream.end();
  await finished(writeStream);
}
