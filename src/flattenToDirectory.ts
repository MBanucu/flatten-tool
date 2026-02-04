import { copyFile, mkdir, rename, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { escapePathComponent } from './utils.ts';

interface FlattenToDirOptions {
  move: boolean;
  overwrite: boolean;
}

export async function flattenToDirectory(
  files: string[],
  absSource: string,
  absTarget: string,
  options: FlattenToDirOptions
): Promise<void> {
  await mkdir(absTarget, { recursive: true });

  for (const srcPath of files) {
    const relPath = relative(absSource, srcPath);
    const components = relPath.split(sep);
    const escapedComponents = components.map(escapePathComponent);
    const newName = escapedComponents.join('_');
    const tgtPath = join(absTarget, newName);

    try {
      await stat(tgtPath);
      if (!options.overwrite) {
        throw new Error(`Target file "${tgtPath}" already exists. Use --overwrite to force.`);
      }
      console.warn(`Overwriting existing file: ${tgtPath}`);
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }

    if (options.move) {
      await rename(srcPath, tgtPath);
    } else {
      await copyFile(srcPath, tgtPath);
    }
  }
}