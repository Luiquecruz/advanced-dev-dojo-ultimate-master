1. Write `Getters` as a homomorphic mapped type whose `as` clause builds `get` + `Capitalize<string & K>` and whose value is `() => T[K]`.
2. Write `PickByValue` with an `as` clause that keeps `K` when `T[K]` is assignable to `V` and maps it to `never` otherwise.
3. Write `EventHandlers` by iterating over the event union directly, naming each property from the member's `type` and typing the handler parameter with that member.
4. Implement `createGetters` by collecting closures in a `Record<string, () => unknown>` and asserting it to `Getters<T>` at the end.
