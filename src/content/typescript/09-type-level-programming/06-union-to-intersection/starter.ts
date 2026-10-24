// TODO: fix the bug, this returns the union instead of the intersection
type UnionToIntersection<U> = (U extends unknown ? () => U : never) extends () => infer I ? I : never;

type Simplify<T> = { [K in keyof T]: T[K] } & {};

// TODO: merge every object of the tuple into one flat object type
type MergeAll<T extends readonly object[]> = T[number];

function mergeAll<const T extends readonly object[]>(...objects: T): MergeAll<T> {
  // TODO: copy every object into a new one
  return objects[0] as MergeAll<T>;
}
