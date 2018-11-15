export function project<T, U>(source: { [key: string]: T }, fn: (t: T) => U): { [key: string]: U } {
  const result = {} as { [key: string]: U };
  for (const k in source) {
    result[k] = fn(source[k]);
  }
  return result;
}
