import { readdir, rmdir } from 'node:fs/promises';
import { join } from 'node:path';

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
