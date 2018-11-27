import * as path from 'path';
import * as tar from 'tar';

import { fs } from './fs';
import { withTempDirectory } from './tempfile';

export async function extractTextFileFromTar(tarfile: string, containedFilePath: string, encoding?: string): Promise<string | undefined> {
  return await withTempDirectory(async (tempdir) => {
    try {
      await tar.x({
        file: tarfile,
        cwd: tempdir
      }, [containedFilePath]);
      const extractedFilePath = path.join(tempdir, containedFilePath);
      if (await fs.exists(extractedFilePath)) {
        return await fs.readTextFile(containedFilePath, encoding) as string;
      }
      return undefined;
    } catch {
      return undefined;
    }
  });
}
