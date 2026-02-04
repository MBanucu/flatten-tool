export function buildTreeObject(relPaths: string[]): any {
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
