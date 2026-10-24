type MyExclude<T, U> = T extends U ? never : T;

type MyExtract<T, U> = T extends U ? T : never;

type IsNever<T> = [T] extends [never] ? true : false;

type ArrayOf<T> = [T] extends [unknown] ? T[] : never;

type IsUnion<T, All = T> = IsNever<T> extends true
  ? false
  : T extends unknown
    ? [All] extends [T]
      ? false
      : true
    : never;
