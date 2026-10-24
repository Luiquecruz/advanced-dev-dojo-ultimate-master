type Paths<T> = {
  [K in keyof T & string]: T[K] extends readonly unknown[] | ((...args: never[]) => unknown)
    ? K
    : T[K] extends object
      ? K | `${K}.${Paths<T[K]>}`
      : K;
}[keyof T & string];

type Get<T, P extends string> = P extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? Get<T[Head], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

function getByPath<T extends object, P extends Paths<T>>(source: T, path: P): Get<T, P> {
  let current: unknown = source;
  for (const segment of path.split('.')) {
    current = (current as Record<string, unknown>)[segment];
  }
  return current as Get<T, P>;
}
