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
  writer: Bun.FileSink
) {
  const indent = '  '.repeat(depth);

  if (node.familyType === 'descendant' && depth === 0) {
    const parentAnchor = node.parent.slug ?? '';
    writer.write(`${indent}- [..](#${parentAnchor})\n`);
  }

  const entries = Object.entries(node.children);
  entries.sort(compareChildren);

  for (const [pathToChild, child] of entries) {
    writer.write(`${indent}- [${pathToChild}](#${child.slug})\n`);
    if (child.type === 'directory') {
      renderMarkdownTree(child, depth + 1, writer);
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

async function renderFile(fileSection: TreeFile<string>, writer: Bun.FileSink): Promise<void> {
  writer.write(`<a id="${fileSection.slug}"></a>\n# ${fileSection.relPath}\n\n`);

  const ext = extname(fileSection.relPath).slice(1) || 'text';
  const lang = ext;
  const isMd = ['md', 'markdown'].includes(ext.toLowerCase());

  const content = await Bun.file(fileSection.srcPath).text();

  const ticks = calculateTicks(content, isMd);

  writer.write(`${ticks}${lang}\n`);
  writer.write(content);
  writer.write(`\n${ticks}\n\n`);
}

export async function renderSectionsToMarkdown(
  sections: Section[],
  writer: Bun.FileSink
): Promise<void> {
  for (const section of sections) {
    if (section.type === 'file') {
      await renderFile(section, writer);
      continue;
    }

    const title = section.familyType === 'root' ? 'Project File Tree' : section.relPath;
    writer.write(`<a id="${section.slug}"></a>\n# ${title}\n\n`);
    writer.write('File Tree\n\n');

    renderMarkdownTree(section, 0, writer);
    writer.write('\n');
  }
}
