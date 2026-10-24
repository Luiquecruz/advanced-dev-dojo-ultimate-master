For plain object shapes, `type` and `interface` are almost interchangeable. The differences decide which one
to reach for:

| Need | Use |
| --- | --- |
| Union of values (`'a' \| 'b'`) | `type` only |
| Tuple, function or primitive alias | `type` only |
| Object shape meant to be extended or implemented by classes | `interface` (clearer errors, `extends`) |
| Adding members later (declaration merging) | `interface` only |

```ts
type Theme = 'light' | 'dark';                        // union: must be a type alias
type Pair = [label: string, value: number];           // tuple: must be a type alias
type Formatter = (value: number) => string;           // function type: usually a type alias

interface UserSettings {                              // object shape: interface reads well
  theme: Theme;
  fontSize: number;
}
```

Interfaces cannot express unions directly. `interface Theme = 'light' | 'dark'` is a syntax error, and an
interface can only extend object types whose members are statically known.

A common team convention: **interfaces for object shapes, type aliases for everything else**. Whatever you
choose, be consistent. Pitfall: an interface is "open" (another declaration with the same name merges into
it), while a type alias is "closed" (declaring it twice is a duplicate identifier error).
