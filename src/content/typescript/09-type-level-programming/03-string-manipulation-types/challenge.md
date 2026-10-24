Build a small string toolkit at the type level, then type a runtime function with it.

1. `type Whitespace = ' ' | '\n' | '\t'` is given. `type TrimStart<S extends string>` removes every leading
   whitespace character (any mix of the three).
2. `type ReplaceAll<S extends string, From extends string, To extends string>` replaces every occurrence of
   `From` with `To`. Replaced text must not be scanned again, and an empty `From` returns `S` unchanged.
3. `type Split<S extends string, Separator extends string>` splits `S` into a tuple like JavaScript's
   `split` does for a non-empty separator: `Split<'a,b,c', ','>` is `['a', 'b', 'c']`,
   `Split<'abc', ','>` is `['abc']` and `Split<'', ','>` is `['']`.
4. `type KebabToCamel<S extends string>`: `'background-color'` becomes `'backgroundColor'`, and
   `'is-very-long'` becomes `'isVeryLong'`.
5. `type StringLength<S extends string>`: the number of characters as a number literal.
6. `function kebabToCamel<S extends string>(value: S): KebabToCamel<S>` performs the same conversion at
   runtime.

The built-in `string.length` cannot be used at the type level; count with a tuple.
