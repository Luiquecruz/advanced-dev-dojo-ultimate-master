1. Add `this: Counter` as the first parameter of the standalone `increment` and implement the body with `this.count` and `this.step`.
2. Add the same `this` parameter to the method in the `Counter` interface so the compiler checks every call site of the method.
3. Notice that `createCounter` still compiles: the function's `this` type matches the object it is attached to.
4. In `bindIncrement`, return a function with the receiver fixed, using `bind` or a wrapping arrow function.
5. Hover the result of `bind` to see that its type no longer has a `this` parameter.
