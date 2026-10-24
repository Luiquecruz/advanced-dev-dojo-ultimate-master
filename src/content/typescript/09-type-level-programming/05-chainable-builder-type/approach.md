1. Declare `Simplify` as a homomorphic identity mapped type intersected with `{}`.
2. Give `option` its own type parameters for the key and the value, and return a `Chainable` whose state is the previous state intersected with `Record<K, V>`.
3. Type the `key` parameter with a conditional type that becomes `never` when `K` is already in `keyof T`.
4. Type `get` as returning `Simplify<T>`.
5. In the implementation, repeat the generic signature in the object literal method and create a new builder from a spread copy of the state, asserting it to the accumulated type.
