export interface CredentialLocation {
  readonly env?: string;
  readonly path?: string;
}

export interface BundleCredential extends CredentialLocation {
  readonly name: string;
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
