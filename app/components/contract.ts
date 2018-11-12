export interface Actionable {
  readonly action: 'install' | 'upgrade' | 'uninstall' | 'report' | null;
  readonly state?: any;
}
