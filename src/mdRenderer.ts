import type { TreeNode } from './treeBuilder.ts';

export function renderMarkdownTree(
  node: TreeNode,
  depth: number = 0,
  prefix: string = '',
  anchorMap: Map<string, string>,
  parentPath: string | null
): string {
  let result = '';
  const indent = '  '.repeat(depth);

  if (parentPath !== null && depth === 0) {
    const parentAnchor = anchorMap.get(parentPath) ?? '';
    result += `${indent}- [..](#${parentAnchor})\n`;
  }

  const entryIndent = '  '.repeat(depth);

  const entries: [string, TreeNode | string][] = Object.entries(node);

  entries.sort(([a], [b]) => {
    const aDir = a.endsWith('/');
    const bDir = b.endsWith('/');
    if (aDir !== bDir) return aDir ? -1 : 1;
    return a.toLowerCase().localeCompare(b.toLowerCase());
  });

  for (const [key, value] of entries) {
    const isDir = key.endsWith('/');
    const name = isDir ? key.slice(0, -1) : key;
    const display = isDir ? `${name}/` : name;
    const pathHere = prefix ? `${prefix}/${name}` : name;
    const anchor = anchorMap.get(pathHere) ?? '';

    result += `${entryIndent}- [${display}](#${anchor})\n`;

    if (isDir) {
      result += renderMarkdownTree(value as TreeNode, depth + 1, pathHere, anchorMap, prefix);
    }
  }

  return result;
}
