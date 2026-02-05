import { readdir, rmdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { TreeFile, TreeDescendantDirectory, SlugType } from './treeBuilder';

export function escapePathComponent(component: string): string {
  return component.replace(/_/g, '__');
}

export async function removeEmptyDirs(dir: string, root?: string): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await removeEmptyDirs(join(dir, entry.name), root);
    }
  }
  if (dir !== root) {
    try {
      await rmdir(dir);
    } catch {
      // Not empty, skip
    }
  }
}

export async function validateTargetPath(absTarget: string, overwrite: boolean): Promise<void> {
  let targetExists = false;
  try {
    await stat(absTarget);
    targetExists = true;
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code !== 'ENOENT') throw err;
  }

  if (targetExists && !overwrite) {
    throw new Error(`Target file "${absTarget}" already exists. Use --overwrite to force.`);
  }

  if (targetExists) {
    console.warn(`Overwriting existing file: ${absTarget}`);
  }
}

export function compareChildren(a: [string, TreeFile<SlugType> | TreeDescendantDirectory<SlugType>], b: [string, TreeFile<SlugType> | TreeDescendantDirectory<SlugType>]) {
    const aDir = a[1].type === 'directory';
    const bDir = b[1].type === 'directory';
    if (aDir !== bDir) return aDir ? -1 : 1;
    return a[0].toLowerCase().localeCompare(b[0].toLowerCase());
}