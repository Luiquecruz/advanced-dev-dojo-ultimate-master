// TODO: remove the members of T assignable to U
type MyExclude<T, U> = T;

// TODO: keep only the members of T assignable to U
type MyExtract<T, U> = T;

// TODO: fix the bug, IsNever<never> must be true
type IsNever<T> = T extends never ? true : false;

// TODO: fix the bug, ArrayOf<string | number> must be (string | number)[]
type ArrayOf<T> = T extends unknown ? T[] : never;

// TODO: true when T is a union of two or more members
type IsUnion<T> = false;
