import * as cnab from 'cnabjs';

import { byName } from "./sort-orders";

export interface CredentialLocation {
  readonly env?: string;
  readonly path?: string;
}

export interface NamedCredential extends cnab.Credential {
  readonly name: string;
}

export interface CredentialSetEntry {
  readonly destinationKind: 'env' | 'path';
  readonly destinationRef: string;
  readonly kind: 'value' | 'env' | 'path' | 'command';
  readonly value: string;
}

export function hasCredentials(manifest: cnab.Bundle): boolean {
    const credentials = manifest.credentials || {};
    return Object.keys(credentials).length > 0;
}

export function parseCredentials(manifest: cnab.Bundle): ReadonlyArray<NamedCredential> {
  const credentials = manifest.credentials;
  const bcs: NamedCredential[] = [];
  if (credentials) {
      for (const k in credentials) {
          bcs.push({ name: k, ...credentials[k] });
      }
  }
  bcs.sort(byName);
  return bcs;
}

export function credentialsYAML(name: string, values: { [key: string]: CredentialSetEntry }): string {
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
