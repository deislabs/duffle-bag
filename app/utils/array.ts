export function flatten<T>(arrays: T[][]): T[] {
  return Array.of<T>().concat(...arrays);
}
