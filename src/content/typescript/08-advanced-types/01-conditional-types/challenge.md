Build a small library of type-level helpers with **conditional types**, then use one of them to type a runtime function.

1. `type If<C extends boolean, T, F>`: resolves to `T` when `C` is `true` and to `F` when `C` is `false`.
   Keep the `boolean` constraint, so `If<'yes', 1, 2>` is a compile error.
2. `type IsString<T>`: `true` when `T` is assignable to `string`, otherwise `false`.
3. `type TypeName<T>`: mirrors JavaScript's `typeof` operator:

   | `T` assignable to | Result |
   | --- | --- |
   | `string` | `'string'` |
   | `number` | `'number'` |
   | `boolean` | `'boolean'` |
   | `undefined` | `'undefined'` |
   | a function (`(...args: never[]) => unknown`) | `'function'` |
   | anything else | `'object'` |

4. `type Flatten<T>`: when `T` is an array (including readonly arrays and tuples) resolve to its element
   type, otherwise leave `T` unchanged. Only one level is unwrapped: `Flatten<string[][]>` is `string[]`.
5. Implement `typeName<T>(value: T): TypeName<T>` returning the runtime `typeof` string of `value`
   (`null` and objects both return `'object'`).

`any` is not allowed.
