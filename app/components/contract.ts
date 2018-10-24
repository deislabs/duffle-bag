export interface Actionable {
  readonly action: 'install' | 'upgrade' | 'uninstall' | null;
}
