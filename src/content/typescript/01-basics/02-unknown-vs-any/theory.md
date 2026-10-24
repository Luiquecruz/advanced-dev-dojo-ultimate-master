`any` turns the type checker **off** for a value: every operation is allowed, so mistakes reach runtime.
`unknown` is the **type-safe counterpart**: any value can be assigned to it, but you cannot use it
until you **narrow** it with a runtime check.

```ts
function shout(value: unknown): string {
  if (typeof value === 'string') {
    return value.toUpperCase(); // value is string here
  }
  return 'not a string';
}
```

Prefer `unknown` for data whose shape you do not control yet, such as parsed JSON or user input.
