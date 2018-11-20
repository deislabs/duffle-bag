import { withTempFile } from "./tempfile";

export const bundle: any = require('../../data/bundle.json');
export const cnab: string | undefined = loadCNAB();
export const fullBundle: Buffer | undefined = loadFullBundle();

function loadCNAB(): string | undefined {
  try {
    return require('../../data/bundle.cnab');
  } catch {
    return undefined;
  }
}

function loadFullBundle(): Buffer | undefined {
  try {
    return require('../../data/bundle.tgz');
  } catch {
    return undefined;
  }
}

export function withBundleFile<T>(fn: (bundleFilePath: string, isSigned: boolean) => Promise<T>): Promise<T> {
  const signed = !!cnab;
  const ext = signed ? 'cnab' : 'json';
  const bundleText = cnab || JSON.stringify(bundle, undefined, 2);
  return withTempFile(bundleText, ext, (path) => fn(path, signed));
}
