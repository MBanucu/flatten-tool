import GithubSlugger from 'github-slugger';
import { compareChildren } from './utils';

export type SlugType = string | undefined;

export interface TreeEntry<T extends SlugType> {
  type: 'file' | 'directory';
  relPath: string;
  name: string;
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
    name: 'Project File Tree',
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
            name: part,
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
          name: part,
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

export class SectionsCollector {
  private anchorSlugger: GithubSlugger = new GithubSlugger();

  private createChild(
    childWithoutSlugDir: TreeDescendantDirectory<undefined>,
    parent: TreeDirectory<string>
  ) {
    const child: TreeDescendantDirectory<string> = {
      ...childWithoutSlugDir,
      children: {},
      parent,
      slug: this.anchorSlugger.slug(childWithoutSlugDir.relPath),
    };

    const { children: subChildren, sections: subSections } = this.collectSections(
      childWithoutSlugDir,
      child
    );
    child.children = subChildren;

    return { child, subSections };
  }

  private collectSections(
    parentWithoutSlug: TreeDirectory<undefined>,
    parent: TreeDirectory<string>
  ): { children: TreeChildren<string>; sections: Section[] } {
    const children: TreeChildren<string> = {};
    const sections: Section[] = [];

    const childrenWithoutSlug = Object.entries(parentWithoutSlug.children);
    childrenWithoutSlug.sort(compareChildren);

    for (const [childWithoutSlugName, childWithoutSlug] of childrenWithoutSlug) {
      if (childWithoutSlug.type === 'directory') {
        const { child, subSections } = this.createChild(childWithoutSlug, parent);

        children[childWithoutSlugName] = child;
        sections.push(child);
        sections.push(...subSections);
      } else {
        const childWithoutSlugFile = childWithoutSlug;

        const child: TreeFile<string> = {
          ...childWithoutSlugFile,
          slug: this.anchorSlugger.slug(childWithoutSlugFile.relPath),
          parent,
        };
        sections.push(child);
        children[childWithoutSlugName] = child;
      }
    }

    return { children, sections };
  }

  public buildTreeWithSlugs(rootWithoutSlug: TreeRootDirectory<undefined>): {
    root: TreeRootDirectory<string>;
    sections: Section[];
  } {
    const sections: Section[] = [];

    const root: TreeRootDirectory<string> = {
      ...rootWithoutSlug,
      children: {},
      slug: this.anchorSlugger.slug(rootWithoutSlug.name),
    };

    const { children, sections: subSections } = this.collectSections(rootWithoutSlug, root);

    root.children = children;
    sections.push(root);
    sections.push(...subSections);

    return { root, sections };
  }
}
