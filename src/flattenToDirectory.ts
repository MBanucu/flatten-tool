import { mkdir, rename, rm } from 'node:fs/promises';
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

    const targetFile = Bun.file(tgtPath);
    const targetExists = await targetFile.exists();

    if (targetExists && !options.overwrite) {
      throw new Error(`Target file "${tgtPath}" already exists. Use --overwrite to force.`);
    }

    if (targetExists) {
      console.warn(`Overwriting existing file: ${tgtPath}`);
    }

    if (options.move) {
      try {
        await rename(srcPath, tgtPath);
      } catch (err: any) {
        if (err.code === 'EXDEV') {
          // Cross-device move: fallback to copy + delete
          await Bun.write(tgtPath, Bun.file(srcPath));
          await rm(srcPath, { force: true });
        } else {
          throw err;
        }
      }
    } else {
      await Bun.write(tgtPath, Bun.file(srcPath));
    }
  }
}
