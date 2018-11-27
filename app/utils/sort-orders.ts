export interface Named {
  readonly name: string;
}

export function byName(a: Named, b: Named): number {
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }
  return 0;
}
