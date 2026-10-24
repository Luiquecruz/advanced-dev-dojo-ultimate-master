A template literal type looks like a template string with types inside the placeholders: `` `${number}${CssUnit}` ``.
---
`ChangeEvent` only needs the string keys of `T`: put `string & keyof T` in the placeholder. Unions inside placeholders expand to every member automatically.
---
`ParseVersion` is one conditional type with three constrained holes separated by dots: `` `${infer Major extends number}.${infer Minor extends number}.${infer Patch extends number}` ``.
---
For `toPx`, declare the return type as `` `${N}px` ``. A template string returned from that function is checked against the declared template literal type, so no assertion is needed.
