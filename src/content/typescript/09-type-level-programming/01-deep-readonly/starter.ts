// TODO: make every property readonly at every depth, keep functions callable
type DeepReadonly<T> = { readonly [K in keyof T]: T[K] };

// TODO: make every nested plain-object property optional, keep arrays and functions
type DeepPartial<T> = { [K in keyof T]?: T[K] };

function deepFreeze<T>(value: T): DeepReadonly<T> {
  // TODO: freeze nested objects and arrays too
  return Object.freeze(value) as DeepReadonly<T>;
}
