import type { TreeDescendantDirectory, TreeRootDirectory } from './treeBuilder.ts';

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

  entries.sort(([aKey, aValue], [bKey, bValue]) => {
    const aDir = aValue.type === 'directory';
    const bDir = bValue.type === 'directory';
    if (aDir !== bDir) return aDir ? -1 : 1;
    return aKey.toLowerCase().localeCompare(bKey.toLowerCase());
  });

  for (const [pathToChild, child] of entries) {
    writeStream.write(`${indent}- [${pathToChild}](#${child.slug})\n`);

    if (child.type === 'directory') {
      renderMarkdownTree(child, depth + 1, writeStream);
    }
  }
}
