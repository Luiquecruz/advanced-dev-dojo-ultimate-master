type MyReturnType<F> = F extends (...args: never[]) => infer R ? R : never;

type MyParameters<F> = F extends (...args: infer P) => unknown ? P : never;

type FirstArgument<F> = F extends (...args: infer P) => unknown
  ? P extends [infer First, ...unknown[]]
    ? First
    : never
  : never;

type UnwrapPromise<T> = T extends Promise<infer V> ? V : T;

type ToNumber<S> = S extends `${infer N extends number}` ? N : never;
