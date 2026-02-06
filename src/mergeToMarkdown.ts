import { relative } from 'node:path';
import { renderSectionsToMarkdown } from './mdRenderer.ts';
import { buildTreeObject, SectionsCollector } from './treeBuilder.ts';
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
  const { sections } = new SectionsCollector().buildTreeWithSlugs(treeObj);

  const writer = Bun.file(absTarget).writer();

  await renderSectionsToMarkdown(sections, writer);

  await writer.end();
}
