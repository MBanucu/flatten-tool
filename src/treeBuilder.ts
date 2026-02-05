export type SlugType = string | undefined;

export interface TreeEntry<T extends SlugType> {
  type: 'file' | 'directory';
  relPath: string;
  slug: T;
}

export interface FamiliyType {
  familyType: 'root' | 'descendant';
}

export interface TreeDescendant<T extends SlugType> extends FamiliyType {
  parent: TreeDirectory<T>;
  familyType: 'descendant';
}

export interface TreeRoot extends FamiliyType {
  familyType: 'root';
}

export interface TreeFile<T extends SlugType> extends TreeEntry<T>, TreeDescendant<T> {
  type: 'file';
  srcPath: string;
}

export interface TreeDirectory<T extends SlugType> extends TreeEntry<T> {
  type: 'directory';
  children: TreeChildren<T>;
}

export interface TreeRootDirectory<T extends SlugType> extends TreeDirectory<T>, TreeRoot {}

export interface TreeDescendantDirectory<T extends SlugType>
  extends TreeDirectory<T>,
    TreeDescendant<T> {}

export interface TreeChildren<T extends SlugType> {
  [key: string]: TreeFile<T> | TreeDescendantDirectory<T>;
}

export function buildTreeObject(paths: { relPath: string; srcPath: string }[]) {
  const tree: TreeRootDirectory<undefined> = {
    children: {},
    type: 'directory',
    familyType: 'root',
    relPath: '',
    slug: undefined,
  };
  for (const path of paths) {
    const parts = path.relPath.split('/');
    let parent: TreeDirectory<undefined> = tree;
    let children = tree.children;
    const currentParts: string[] = [];
    for (const [index, part] of parts.entries()) {
      currentParts.push(part);

      if (index < parts.length - 1) {
        // Directory
        if (children[part] === undefined) {
          children[part] = {
            relPath: currentParts.join('/'),
            type: 'directory',
            familyType: 'descendant',
            children: {},
            parent,
            slug: undefined,
          };
        }
        if (children[part].type === 'directory') {
          parent = children[part];
          children = children[part].children;
        }
      } else {
        // File
        children[part] = {
          relPath: path.relPath,
          type: 'file',
          familyType: 'descendant',
          parent,
          srcPath: path.srcPath,
          slug: undefined,
        };
      }
    }
  }
  return tree;
}
