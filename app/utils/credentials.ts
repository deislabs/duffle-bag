export function hasCredentials(manifest: any /* BundleManifest */): boolean {
    const credentials = manifest.credentials || {};
    return Object.keys(credentials).length > 0;
}
