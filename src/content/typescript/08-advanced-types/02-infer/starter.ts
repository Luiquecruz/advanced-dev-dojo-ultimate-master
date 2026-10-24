// TODO: infer the return type of a function type
type MyReturnType<F> = unknown;

// TODO: infer the whole parameter list as a tuple
type MyParameters<F> = unknown[];

// TODO: infer only the first parameter
type FirstArgument<F> = unknown;

// TODO: unwrap one Promise level, leave other types unchanged
type UnwrapPromise<T> = T;

// TODO: convert a numeric string literal into a number literal
type ToNumber<S> = number;
