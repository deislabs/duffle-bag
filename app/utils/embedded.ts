import * as request from 'request-promise-native';

import { withTempFile, withBinaryTempFile } from "./tempfile";
import { BundleManifest } from './duffle.objectmodel';

export const bundlePromise: Promise<BundleManifest> = loadBundleManifest();
export const cnabPromise: Promise<string | undefined> = loadCNAB();
export const fullBundlePromise: Promise<{} | undefined> = loadFullBundle();

async function loadBundleManifest(): Promise<BundleManifest> {
  return require('../../data/bundle.json');
}

async function loadCNAB(): Promise<string | undefined> {
  try {
    return require('../../data/bundle.cnab');
  } catch {
    return undefined;
  }
}

function fullBundleURL(): string | undefined {
  try {
    return require('../../data/bundle.tgz');
  } catch {
    return undefined;
  }
}

async function loadFullBundle(): Promise<{} | undefined> {
  const bundleUrl = fullBundleURL();
  if (!bundleUrl) {
    return undefined;
  }
  const bundleContent = await request.get(bundleUrl, { encoding: null });
  return bundleContent;
}

export async function withBundleFile<T>(fn: (bundleFilePath: string, isSigned: boolean) => Promise<T>): Promise<T> {
  const cnab = await cnabPromise;
  const bundle = await bundlePromise;
  const signed = !!cnab;
  const ext = signed ? 'cnab' : 'json';
  const bundleText = cnab || JSON.stringify(bundle, undefined, 2);
  return await withTempFile(bundleText, ext, (path) => fn(path, signed));
}

export async function withFullBundle<T>(fn: (bundleFilePath: string | undefined) => Promise<T>): Promise<T> {
  const fullBundle = await fullBundlePromise;
  if (!fullBundle) {
    return fn(undefined);
  }
  return withBinaryTempFile(fullBundle as any, 'tgz', (path) => fn(path));
}
