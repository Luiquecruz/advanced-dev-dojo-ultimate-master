// TODO: union of every dot path, stopping at arrays and functions
type Paths<T> = keyof T & string;

// TODO: the type at path P, never when it does not exist
type Get<T, P extends string> = P extends keyof T ? T[P] : never;

function getByPath<T extends object, P extends Paths<T>>(source: T, path: P): Get<T, P> {
  // TODO: walk every segment of the path
  return source[path] as Get<T, P>;
}
