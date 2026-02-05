import GithubSlugger from 'github-slugger';

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

export type Section<T extends SlugType = string> =
  | TreeRootDirectory<T>
  | TreeDescendantDirectory<T>
  | TreeFile<T>;

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

export function collectSections(
  treeNode: TreeDirectory<undefined>,
  parentDirWithSlug: TreeDirectory<string>,
  sections: Section[],
  anchorSlugger: GithubSlugger
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
    collectSections(dir, childDirWithSlug, sections, anchorSlugger);
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

export function buildTreeWithSlugs(treeObj: TreeRootDirectory<undefined>): {
  rootDirWithSlug: TreeRootDirectory<string>;
  sections: Section[];
} {
  const sections: Section[] = [];
  const anchorSlugger = new GithubSlugger();

  const rootDirWithSlug: TreeRootDirectory<string> = {
    ...treeObj,
    children: {},
    slug: anchorSlugger.slug('Project File Tree'),
  };
  sections.push(rootDirWithSlug);
  collectSections(treeObj, rootDirWithSlug, sections, anchorSlugger);

  return { rootDirWithSlug, sections };
}
