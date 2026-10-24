Most JavaScript data lives in objects, so most TypeScript types describe **object shapes**. An object type
literal lists every property and its type between braces, separated by semicolons or commas:

```ts
function greet(person: { firstName: string; age: number }): string {
  return `Hello, ${person.firstName} (${person.age})`;
}
```

Writing the same literal over and over gets noisy, so give it a name with a **type alias**:

```ts
type Person = { firstName: string; age: number };

function greet(person: Person): string { /* ... */ }
```

A property followed by `?` is **optional**: callers may omit it, and inside the function its type
becomes `T | undefined`, so you must check it before using it as a `T`:

```ts
type Person = { firstName: string; nickname?: string };

function displayName(person: Person): string {
  if (person.nickname) {
    return person.nickname.toUpperCase(); // narrowed to string
  }
  return person.firstName;
}
```

Common pitfalls: forgetting that an optional property can be `undefined` (calling `.toUpperCase()` on it
directly is a compile error), and confusing `nickname?: string` (the key may be absent) with
`nickname: string | undefined` (the key must be present, even if its value is `undefined`).
