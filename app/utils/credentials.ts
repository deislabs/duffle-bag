import * as dufflepaths from './duffle.paths';
import { fs } from './fs';

export interface CredentialLocation {
  readonly env?: string;
  readonly path?: string;
}

export interface BundleCredential extends CredentialLocation {
  readonly name: string;
}

export interface CredentialSetEntry {
  readonly destinationKind: 'env' | 'path';
  readonly destinationRef: string;
  readonly kind: 'value' | 'env' | 'path' | 'command';
  readonly value: string;
}

export function hasCredentials(manifest: any /* BundleManifest */): boolean {
    const credentials = manifest.credentials || {};
    return Object.keys(credentials).length > 0;
}

export function parseCredentials(manifest: any): BundleCredential[] {
  const credentials = manifest.credentials;
  const bcs: BundleCredential[] = [];
  if (credentials) {
      for (const k in credentials) {
          bcs.push({ name: k, ...credentials[k] });
      }
  }
  return bcs;
}

export async function writeCredentialValuesToSet(values: { [key: string]: CredentialSetEntry }): Promise<string> {
  const credentialSetName = makeCredentialSetName();
  const credentialSetPath = dufflepaths.credentialSetPath(credentialSetName);
  const yaml = credentialsYAML(credentialSetName, values);
  await fs.writeFile(credentialSetPath, yaml);
  return credentialSetName;
}

function credentialsYAML(name: string, values: { [key: string]: CredentialSetEntry }): string {
  const prefix = [`name: ${name}`, 'credentials:'];
  const valueYAMLs = Object.keys(values).map((k) => valueYAML(k, values[k]));
  const lines = prefix.concat(...valueYAMLs);
  return lines.join('\n');
}

function valueYAML(name: string, value: CredentialSetEntry) {
  return `- name: ${name}
  source:
    ${value.kind}: ${value.value}
  destination:
    ${value.destinationKind}: ${value.destinationRef}`;
}

function makeCredentialSetName(): string {
  function randomIn(min: number, max: number) {
    return Math.floor(Math.random() * (max - min) + min);
  }
  function timestamp(d: Date) {
    // We really don't care about the detailed formatting. We just want something
    // reasonably unique.  (TODO: GUIDs. If there's a problem that can't be solved
    // with MOAR GUIDs then I don't want to know about it.)
    return `${d.getFullYear()}${d.getMonth()}${d.getDay()}-${d.getHours()}${d.getMinutes()}${d.getSeconds()}-${d.getMilliseconds()}`;
  }
  const t = timestamp(new Date());
  const r = randomIn(10000, 99999);
  return `credset-${t}-${r}`;
}
