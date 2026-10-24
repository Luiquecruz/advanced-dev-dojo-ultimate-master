Write four mapped types and use one of them in a runtime helper.

1. `type Mutable<T>`: removes `readonly` from every property (optional properties stay optional).
   It must also turn `readonly string[]` into `string[]`.
2. `type Concrete<T>`: makes every property required, without using the built-in `Required`.
3. `type Nullable<T>`: every property also accepts `null`, while **keeping** the original `readonly` and
   `?` modifiers.
4. `type FlagMap<Keys extends string>`: an object with one `boolean` property per key.
5. `function createFlags<const Keys extends string>(keys: readonly Keys[]): FlagMap<Keys>` returns an object
   with every key set to `false`.

```ts
const flags = createFlags(['darkMode', 'beta']);
// { darkMode: false, beta: false }, typed as FlagMap<'darkMode' | 'beta'>
```

`any` is not allowed.
