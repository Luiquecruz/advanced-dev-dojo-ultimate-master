Every helper is a recursive conditional type over a template literal pattern. `TrimStart` matches `` `${Whitespace}${infer Rest}` `` and recurses on `Rest`.
---
`ReplaceAll` matches `` `${infer Before}${From}${infer After}` ``, emits `` `${Before}${To}` `` and recurses on `After` only, so replaced text is never scanned again. Check `From extends ''` first.
---
`Split` returns `[Head, ...Split<Rest, Separator>]` while the separator is found and `[S]` when it is not. `KebabToCamel` capitalizes the converted rest: `` `${Word}${Capitalize<KebabToCamel<Rest>>}` ``.
---
For `StringLength`, add a second parameter `Counter extends unknown[] = []`. Consume one character with `` `${string}${infer Rest}` ``, push one element into the counter, and return `Counter['length']` when the string is empty. At runtime, `value.replace(/-(\w)/g, ...)` does the conversion.
