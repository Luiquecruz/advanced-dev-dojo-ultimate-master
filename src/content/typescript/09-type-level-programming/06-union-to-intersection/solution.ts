type UnionToIntersection<U> = (U extends unknown ? (arg: U) => void : never) extends (arg: infer I) => void
  ? I
  : never;

type Simplify<T> = { [K in keyof T]: T[K] } & {};

type MergeAll<T extends readonly object[]> = Simplify<UnionToIntersection<T[number]>>;

function mergeAll<const T extends readonly object[]>(...objects: T): MergeAll<T> {
  return Object.assign({}, ...objects) as MergeAll<T>;
}
