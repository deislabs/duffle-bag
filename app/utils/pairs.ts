export interface Pair {
    readonly key: string;
    readonly value: string;
}

export function fromStringMap(source: { [key: string]: string }): Pair[] {
  const result: Pair[] = [];
  for (const k in source) {
    result.push({ key: k, value: source[k] });
  }
  return result;
}
