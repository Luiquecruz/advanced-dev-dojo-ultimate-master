## Accessors: `get` and `set`

Accessors look like properties to the caller but run code. Use them for derived values and for validation
on assignment.

```ts
class Rectangle {
  #width = 0;

  constructor(width: number, public height: number) {
    this.width = width;           // goes through the setter
  }

  get width(): number {
    return this.#width;
  }

  set width(value: number) {
    if (value < 0) throw new RangeError('width must be >= 0');
    this.#width = value;
  }

  get area(): number {            // getter without setter
    return this.#width * this.height;
  }
}

const box = new Rectangle(2, 3);
box.width = 4;   // validated
box.area;        // 12
box.area = 1;    // error: Cannot assign to 'area' because it is a read-only property
```

A getter without a setter is inferred as `readonly`. Since TypeScript 5.1, the getter and setter may even
have **unrelated types** (for example a setter accepting `string | number` and a getter returning `number`),
as long as both are annotated.

**Auto-accessors** (TS 4.9, part of the standard decorators proposal) generate a private backing field and
a get/set pair: `accessor count = 0;`. They mainly exist so decorators can intercept reads and writes.

Accessors in interfaces are written like properties (`readonly area: number`), or with `get area(): number`
signatures; a class can implement a property with a getter and vice versa.

## Static members

`static` members belong to the class itself, not to instances. They are shared state and utilities related
to the type.

```ts
class IdGenerator {
  static readonly PREFIX = 'id-';
  static #next = 1;               // private static field

  static next(): string {
    return `${IdGenerator.PREFIX}${IdGenerator.#next++}`;
  }

  static {                        // static initialization block (ES2022)
    IdGenerator.#next = 100;
  }
}

IdGenerator.next();    // "id-100"
```

- Inside a static method, `this` is the class (or the subclass it was called on), not an instance.
- Statics are inherited: `class Child extends IdGenerator {}` exposes `Child.next()`.
- Static members **cannot use the class type parameters**: in `class Box<T>`, `static empty: T` is an error,
  because there is only one static slot shared by every `Box<string>`, `Box<number>`…

## Private constructors and named factories

Marking the constructor `private` forces callers to use static factory methods. This is how you build
**named constructors** (`Color.fromHex`, `Color.fromRgb`) or singletons:

```ts
class Money {
  private constructor(readonly cents: number) {}

  static fromDollars(dollars: number): Money {
    return new Money(Math.round(dollars * 100));
  }
}

new Money(5);          // error: Constructor of class 'Money' is private
Money.fromDollars(5);  // ok
```

`private constructor` is a compile-time rule. There is no `#constructor` in JavaScript.

## Legacy vs modern

Older code used `Object.defineProperty(this, 'area', { get() { ... } })` or `getArea()` methods, and stored
statics on the constructor after the class (`Counter.instances = 0`). Class syntax covers both today, and
static blocks replace the "initialize statics after the class body" dance.

## Pitfalls

- Getters run on every access. Avoid expensive work or side effects in them.
- A setter without a getter still type checks on reads, but those reads return `undefined` at runtime.
  Pair them.
- Mutable static fields are global state: tests that share a class share its statics.
