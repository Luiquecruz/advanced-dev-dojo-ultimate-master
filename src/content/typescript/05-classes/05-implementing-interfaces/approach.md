1. Add the `implements Cache, Serializable` clause so the compiler reports every missing member.
2. Keep the data in a private `Map` initialized from the optional `initial` record.
3. Delegate `get`, `set`, `has` and `size` to the map, annotating each parameter explicitly.
4. Convert the map back to an object for `serialize`.
5. Assign the class to a `CacheConstructor` constant to verify the static side.
