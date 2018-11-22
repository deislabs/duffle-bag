import * as tmp from 'tmp';

import { fs } from './fs';

export async function withOptionalTempFile<T>(content: string | undefined, fileType: string, fn: (filename: string | undefined) => Promise<T>): Promise<T> {
    if (!content) {
        return fn(undefined);
    }

    const tempFile = tmp.fileSync({ prefix: "dufflebag-", postfix: `.${fileType}` });
    await fs.writeFile(tempFile.name, content);

    try {
        return await fn(tempFile.name);
    } finally {
        tempFile.removeCallback();
    }
}

export async function withTempFile<T>(content: string, fileType: string, fn: (filename: string) => Promise<T>): Promise<T> {
  const tempFile = tmp.fileSync({ prefix: "dufflebag-", postfix: `.${fileType}` });
  await fs.writeFile(tempFile.name, content);

  try {
      return await fn(tempFile.name);
  } finally {
      tempFile.removeCallback();
  }
}

export async function withBinaryTempFile<T>(content: Buffer, fileType: string, fn: (filename: string) => Promise<T>): Promise<T> {
  const tempFile = tmp.fileSync({ prefix: "dufflebag-", postfix: `.${fileType}` });
  await fs.writeFile(tempFile.name, content);

  try {
      return await fn(tempFile.name);
  } finally {
      tempFile.removeCallback();
  }
}

export async function withTempDirectory<T>(fn: (dirpath: string) => Promise<T>): Promise<T> {
    const tempDir = tmp.dirSync({ prefix: "dufflebag-", unsafeCleanup: true });
    try {
        return await fn(tempDir.name);
    } finally {
        tempDir.removeCallback();
    }
}
