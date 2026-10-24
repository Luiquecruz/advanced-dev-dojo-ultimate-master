`extends` creates a subclass that inherits every member of its base class. The subclass may add members
and **override** existing ones.

```ts
class Animal {
  constructor(readonly name: string) {}

  speak(): string {
    return `${this.name} makes a sound`;
  }
}

class Dog extends Animal {
  constructor(name: string, readonly breed: string) {
    super(name);                       // must run before any use of `this`
  }

  override speak(): string {
    return `${super.speak()} (woof)`;  // reuse the base implementation
  }
}
```

## `super`

- In a subclass constructor, `super(...)` must be called before touching `this`. The compiler enforces it.
- `super.method()` calls the base class implementation from an override.

## The `override` keyword

Overriding by name alone is fragile. Rename `speak` in the base class, or misspell it in the subclass
(`speek`), and the subclass silently adds a **new** method instead of overriding: no error, wrong behavior.

TypeScript 4.3 added the `override` modifier:

```ts
class Cat extends Animal {
  override speek(): string { ... }
  // error: This member cannot have an 'override' modifier because it is not declared in the base class 'Animal'
}
```

With `noImplicitOverride: true` (enabled in this environment, and recommended), the reverse is also enforced:
a member that overrides a base member **must** say `override`. Every override becomes visible and checked.
Implementing an `abstract` member does not need `override`.

## Overrides must stay compatible

An override must be assignable to the base member: same or fewer required parameters, compatible parameter
types and a return type that is the same or narrower. Code holding an `Animal` must keep working with a `Dog`
(Liskov substitution).

```ts
class Robot extends Animal {
  override speak(): number { return 42; }   // error: number is not assignable to string
}
```

## `protected` and inheritance

`protected` members are visible in subclasses but not outside. A subclass can widen a `protected` member to
`public` when overriding it, but it cannot make a `public` member `protected`.

## Extending built-ins and `new.target`

With an ES2015+ target you can extend `Error`, `Array` or `Map` directly. A neat trick for error
hierarchies is `new.target`, which refers to the constructor that was actually invoked with `new`:

```ts
class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;   // "AppError", or the subclass name
  }
}
class DbError extends AppError {}
new DbError('timeout').name;       // "DbError"
```

**Legacy note:** when compiling to ES5, subclassing `Error` broke `instanceof` and methods, and code had to
call `Object.setPrototypeOf(this, new.target.prototype)` after `super`. You will still see that line in older
code bases; with modern targets it is unnecessary.

## Pitfall: redeclaring fields

With modern class fields (`useDefineForClassFields`), a subclass field declaration **re-initializes** the
property after the base constructor ran, resetting it to `undefined`. To only narrow a field's type without
emitting anything, use `declare`:

```ts
class Base { value: string | number = 'x'; }
class Narrow extends Base {
  declare value: string;   // type-only redeclaration, no runtime effect
}
```

Prefer composition when a hierarchy grows deeper than two or three levels; inheritance couples classes
tightly.
