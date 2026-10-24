Most constructors repeat every field three times: declare it, accept it as a parameter, assign it.

```ts
class User {
  readonly id: number;
  private email: string;

  constructor(id: number, email: string) {
    this.id = id;
    this.email = email;
  }
}
```

**Parameter properties** collapse that into one line. Put an accessibility modifier (`public`,
`protected`, `private`) and/or `readonly` in front of a constructor parameter, and TypeScript declares the
field **and** assigns it for you:

```ts
class User {
  constructor(
    readonly id: number,
    private email: string,
  ) {}

  domain(): string {
    return this.email.split('@')[1];
  }
}

const user = new User(1, 'ada@example.com');
user.id;     // number
user.email;  // compile error: private
```

The emitted JavaScript contains the declaration and the assignment:

```js
class User {
  id;
  email;
  constructor(id, email) {
    this.id = id;
    this.email = email;
  }
}
```

## Rules

- A parameter becomes a property **only** when it carries a modifier. `constructor(name: string)` is just
  a parameter; `this.name` does not exist.
- `readonly` alone means a public readonly property.
- You may mix parameter properties with normal parameters and regular fields.
- They are only allowed in constructors with a body (not in overload signatures or `declare` classes) and
  cannot be destructured patterns.

## Pitfall: initialization order

Parameter properties are assigned at the **start of the constructor**, but with modern class-field
semantics (`target: ES2022`, `useDefineForClassFields: true`) regular field initializers run **before**
the constructor body. A field initializer that reads a parameter property therefore sees `undefined`, and
the compiler reports it:

```ts
class Badge {
  label = this.name.toUpperCase(); // error TS2729: 'name' is used before its initialization
  constructor(private readonly name: string) {}
}
```

Compute derived values inside the constructor instead, or use a getter.

## Legacy vs modern: erasable syntax

Parameter properties are one of the few TypeScript features that **generate JavaScript code** (the
assignments above). That conflicts with the modern trend of running TypeScript by simply *stripping*
types: Node.js type stripping, Deno, Bun and browsers-with-type-annotations proposals all remove type
syntax without transforming code. TypeScript 5.8 added the `erasableSyntaxOnly` flag, which reports
parameter properties, `enum` and `namespace` with code as errors:

```text
error TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
```

So both styles are legitimate today:

- **Parameter properties**: concise, heavily used in Angular and NestJS code bases.
- **Explicit fields**: required in projects that enable `erasableSyntaxOnly` or run `.ts` files directly
  with type stripping. Combine them with `#private` fields for runtime privacy.

Know both, and follow the project's `tsconfig`.
