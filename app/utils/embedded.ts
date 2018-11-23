import * as path from 'path';
import * as request from 'request-promise-native';

import { withTempFile, withBinaryTempFile, withTempDirectory } from "./tempfile";
import * as duffle from './duffle';
import { BundleManifest } from './duffle.objectmodel';
import { failed, Errorable } from './errorable';
import { fs } from './fs';
import * as shell from './shell';

interface LoadedBundle {
  readonly manifest: BundleManifest;
  readonly signedText: string | undefined;
}

export const bundle: Promise<Errorable<LoadedBundle>> = loadBundle();

async function requireLoadedBundle(): Promise<LoadedBundle> {
  const b = await bundle;
  if (failed(b)) {
    throw new Error('No bundle!');
  }
  return b.result;
}

function loadJSONManifest(): BundleManifest | undefined {
  try {
    return require('../../data/bundle.json');
  } catch {
    return undefined;
  }
}

function loadCNAB(): string | undefined {
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

export function hasFullBundle(): boolean {
  const url = fullBundleURL();
  return url !== undefined && url.length > 0;
}

export async function withBundleFile<T>(fn: (bundleFilePath: string, isSigned: boolean) => Promise<T>): Promise<T> {
  const cnab = (await requireLoadedBundle()).signedText;
  const bundle = (await requireLoadedBundle()).manifest;
  const signed = !!cnab;
  const ext = signed ? 'cnab' : 'json';
  const bundleText = cnab || JSON.stringify(bundle, undefined, 2);
  return await withTempFile(bundleText, ext, (path) => fn(path, signed));
}

async function withFullBundle<T>(fn: (bundleFilePath: string | undefined) => Promise<T>): Promise<T> {
  const fullBundle = await loadFullBundle();
  if (!fullBundle) {
    return fn(undefined);
  }
  return withBinaryTempFile(fullBundle as any, 'tgz', (path) => fn(path));
}

async function loadBundle(): Promise<Errorable<LoadedBundle>> {
  return await withFullBundle<Errorable<LoadedBundle>>(async (bundleFilePath) => {
    if (!bundleFilePath) {
      return loadBundleFromEmbeddedManifests();
    }
    return await withTempDirectory<Errorable<LoadedBundle>>(async (dirpath) => {
      const importResult = await duffle.importFile(shell.shell, bundleFilePath, dirpath);
      if (failed(importResult)) {
        return { succeeded: false, error: importResult.error };
      }
      // We need the extra directory level because 'duffle import' places the files into
      // <source_file_name>/<bundle_name>
      const extractPath = path.join(dirpath, path.basename(bundleFilePath, '.tgz'));
      return await loadBundleFromDirectory(extractPath);
    });
  });
}

function loadBundleFromEmbeddedManifests(): Errorable<LoadedBundle> {
  const signedText = loadCNAB();
  if (signedText) {
    const manifest = extractManifest(signedText);
    return { succeeded: true, result: { manifest, signedText } };
  } else {
    const manifest = loadJSONManifest();
    if (manifest) {
      return { succeeded: true, result: { manifest, signedText: undefined } };
    } else {
      return { succeeded: false, error: ['No CNAB manifest found in installer'] };
    }
  }
}

async function loadBundleFromDirectory(dirpath: string): Promise<Errorable<LoadedBundle>> {
  const jsonFile = path.join(dirpath, 'bundle.json');
  const cnabFile = path.join(dirpath, 'bundle.cnab');
  if (await fs.exists(cnabFile)) {
    const signedText = await fs.readTextFile(cnabFile, 'utf8') as string;
    const manifest = extractManifest(signedText);
    return { succeeded: true, result: { manifest: manifest, signedText: signedText } };
  }
  if (await fs.exists(jsonFile)) {
    const unsignedText = await fs.readTextFile(jsonFile, 'utf8') as string;
    const manifest = JSON.parse(unsignedText);
    return { succeeded: true, result: { manifest: manifest, signedText: undefined } };
  }
  return { succeeded: false, error: ['Full bundle does not contain a CNAB manifest'] };
}

function extractManifest(source: string): BundleManifest {
  const json = jsonOnly(source);
  return JSON.parse(json);
}

function jsonOnly(source: string): string {
  if (source.startsWith("-----BEGIN PGP SIGNED MESSAGE")) {
      return stripSignature(source);
  }
  return source;
}

function stripSignature(source: string): string {
  const lines = source.split('\n');
  const messageStartLine = lines.findIndex((l) => l.startsWith("-----BEGIN PGP SIGNED MESSAGE"));
  const sigStartLine = lines.findIndex((l) => l.startsWith("-----BEGIN PGP SIGNATURE"));
  const messageLines = lines.slice(messageStartLine + 1, sigStartLine);
  if (messageLines[0].startsWith("Hash:")) {
      messageLines.shift();
  }
  return messageLines.join('\n').trim();
}
