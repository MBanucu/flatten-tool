import { createWriteStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { extname, relative } from 'node:path';
import { finished } from 'node:stream/promises';
import GithubSlugger from 'github-slugger';
import { renderMarkdownTree } from './mdRenderer.ts';
import {
  buildTreeObject,
  type TreeDescendantDirectory,
  type TreeDirectory,
  type TreeFile,
  type TreeRootDirectory,
} from './treeBuilder.ts';

interface MergeOptions {
  overwrite: boolean;
}

export async function mergeToMarkdown(
  files: string[],
  absSource: string,
  absTarget: string,
  options: MergeOptions
): Promise<void> {
  let targetExists = false;
  try {
    await stat(absTarget);
    targetExists = true;
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code !== 'ENOENT') throw err;
  }

  if (targetExists && !options.overwrite) {
    throw new Error(`Target file "${absTarget}" already exists. Use --overwrite to force.`);
  }

  if (targetExists) {
    console.warn(`Overwriting existing file: ${absTarget}`);
  }

  const fileEntries = files.map((srcPath) => ({
    srcPath,
    relPath: relative(absSource, srcPath).replace(/\\/g, '/'),
  }));

  const treeObj = buildTreeObject(fileEntries);

  const pathMap = new Map<string, string>();
  fileEntries.forEach(({ srcPath, relPath }) => {
    pathMap.set(relPath, srcPath);
  });

  type Section = TreeRootDirectory<string> | TreeDescendantDirectory<string> | TreeFile<string>;

  const sections: Section[] = [];
  const anchorSlugger = new GithubSlugger();

  function collectSections(
    treeNode: TreeDirectory<undefined>,
    parentDirWithSlug: TreeDirectory<string>
  ): void {
    const dirs: TreeDescendantDirectory<undefined>[] = [];
    const files: TreeFile<undefined>[] = [];

    for (const [_key, value] of Object.entries(treeNode.children)) {
      if (value.type === 'directory') {
        dirs.push(value);
      } else {
        files.push(value);
      }
    }

    dirs.sort((a, b) => a.relPath.toLowerCase().localeCompare(b.relPath.toLowerCase()));
    files.sort((a, b) => a.relPath.toLowerCase().localeCompare(b.relPath.toLowerCase()));

    for (const dir of dirs) {
      const childDirWithSlug: TreeDescendantDirectory<string> = {
        ...dir,
        children: {},
        parent: parentDirWithSlug,
        slug: anchorSlugger.slug(dir.relPath),
      };
      parentDirWithSlug.children[dir.relPath] = childDirWithSlug;
      sections.push(childDirWithSlug);
      collectSections(dir, childDirWithSlug);
    }

    for (const file of files) {
      const childFileWithSlug: TreeFile<string> = {
        ...file,
        parent: parentDirWithSlug,
        slug: anchorSlugger.slug(file.relPath),
      };
      parentDirWithSlug.children[file.relPath] = childFileWithSlug;
      sections.push(childFileWithSlug);
    }
  }

  const rootDirWithSlug: TreeRootDirectory<string> = {
    ...treeObj,
    children: {},
    slug: anchorSlugger.slug('Project File Tree'),
  };
  sections.push(rootDirWithSlug);
  collectSections(treeObj, rootDirWithSlug);

  const writeStream = createWriteStream(absTarget);
  writeStream.setMaxListeners(0);

  function calculateTicks(content: string, isMd: boolean): string {
    if (!isMd) return '```';
    const backtickMatches = content.match(/`+/g);
    const maxTicks = backtickMatches ? Math.max(...backtickMatches.map((m) => m.length)) : 0;
    const requiredTicks = Math.max(3, maxTicks + 1);
    return '`'.repeat(requiredTicks);
  }

  async function renderFile(
    fileSection: TreeFile<string>,
    writeStream: import('node:fs').WriteStream
  ): Promise<void> {
    writeStream.write(`<a id="${fileSection.slug}"></a>\n# ${fileSection.relPath}\n\n`);

    const ext = extname(fileSection.relPath).slice(1) || 'text';
    const lang = ext;
    const isMd = ['md', 'markdown'].includes(ext.toLowerCase());

    const content = await readFile(fileSection.srcPath, 'utf8');
    const ticks = calculateTicks(content, isMd);

    writeStream.write(`${ticks}${lang}\n`);
    writeStream.write(content);
    writeStream.write(`\n${ticks}\n\n`);
  }

  for (const section of sections) {
    if (section.type === 'file') {
      await renderFile(section, writeStream);
      continue;
    }

    const title = section.familyType === 'root' ? 'Project File Tree' : section.relPath;
    writeStream.write(`<a id="${section.slug}"></a>\n# ${title}\n\n`);
    writeStream.write('File Tree\n\n');

    renderMarkdownTree(section, 0, writeStream);

    writeStream.write('\n');
  }

  writeStream.end();
  await finished(writeStream);
}
