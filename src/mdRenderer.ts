import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import type {
  Section,
  TreeDescendantDirectory,
  TreeFile,
  TreeRootDirectory,
} from './treeBuilder.ts';
import { compareChildren } from './utils.ts';

export function renderMarkdownTree(
  node: TreeRootDirectory<string> | TreeDescendantDirectory<string>,
  depth: number = 0,
  writeStream: import('node:fs').WriteStream
) {
  const indent = '  '.repeat(depth);

  if (node.familyType === 'descendant' && depth === 0) {
    const parentAnchor = node.parent.slug ?? '';
    writeStream.write(`${indent}- [..](#${parentAnchor})\n`);
  }

  const entries = Object.entries(node.children);

  entries.sort(compareChildren);

  for (const [pathToChild, child] of entries) {
    writeStream.write(`${indent}- [${pathToChild}](#${child.slug})\n`);

    if (child.type === 'directory') {
      renderMarkdownTree(child, depth + 1, writeStream);
    }
  }
}

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

export async function renderSectionsToMarkdown(
  sections: Section[],
  writeStream: import('node:fs').WriteStream
): Promise<void> {
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
}
