import { createWriteStream } from 'node:fs';
import { relative } from 'node:path';
import { finished } from 'node:stream/promises';
import { renderSectionsToMarkdown } from './mdRenderer.ts';
import { buildTreeObject, buildTreeWithSlugs } from './treeBuilder.ts';
import { validateTargetPath } from './utils.ts';

interface MergeOptions {
  overwrite: boolean;
}

export async function mergeToMarkdown(
  files: string[],
  absSource: string,
  absTarget: string,
  options: MergeOptions
): Promise<void> {
  await validateTargetPath(absTarget, options.overwrite);

  const fileEntries = files.map((srcPath) => ({
    srcPath,
    relPath: relative(absSource, srcPath).replace(/\\/g, '/'),
  }));

  const treeObj = buildTreeObject(fileEntries);
  const { sections } = buildTreeWithSlugs(treeObj);

  const writeStream = createWriteStream(absTarget);
  writeStream.setMaxListeners(0);

  await renderSectionsToMarkdown(sections, writeStream);

  writeStream.end();
  await finished(writeStream);
}
