An **abstract class** is a base class that is not meant to be instantiated on its own. It can contain
real, shared implementation **and** declare members that every subclass must provide.

```ts
abstract class Shape {
  abstract readonly name: string;     // abstract property
  abstract area(): number;            // abstract method: signature only, no body

  describe(): string {                // concrete method shared by every subclass
    return `${this.name} with area ${this.area().toFixed(2)}`;
  }
}

class Circle extends Shape {
  readonly name = 'circle';
  constructor(private radius: number) {
    super();
  }
  area(): number {
    return Math.PI * this.radius ** 2;
  }
}

new Shape();                 // error: Cannot create an instance of an abstract class
new Circle(2).describe();    // "circle with area 12.57"
```

If a subclass forgets an abstract member, the error appears on the subclass:
*"Non-abstract class 'Square' does not implement inherited abstract member 'area' from class 'Shape'"*.
A subclass can itself be `abstract` and leave the member for its own children.

## The template method pattern

The example above is the **template method** pattern: the base class owns the algorithm (`describe`) and
delegates the varying step (`area`) to subclasses. Mark the hook `protected abstract` when callers should
not use it directly:

```ts
abstract class Exporter {
  export(rows: string[]): string {
    return this.header() + this.body(rows);
  }
  protected header(): string {
    return '';
  }
  protected abstract body(rows: string[]): string;
}
```

## Legacy vs modern

Before `abstract` existed (and in plain JavaScript today), base classes "simulated" abstract methods by
throwing at runtime:

```ts
class Shape {
  area(): number {
    throw new Error('Not implemented'); // only fails when somebody calls it
  }
}
```

That moves the error from compile time to runtime, and only on the code path that calls it. With
`abstract`, a missing implementation is a compile error at the class declaration.

## Abstract class vs interface

| | `abstract class` | `interface` |
| --- | --- | --- |
| Shared implementation | yes | no |
| Constructor and fields with initializers | yes | no |
| Exists at runtime (`instanceof`) | yes | no, erased |
| A class can inherit from | one | many (`implements A, B`) |

Prefer an interface for a pure contract. Reach for an abstract class when subclasses really share code or
state.

## Abstract constructor types

A variable of type `typeof Shape` cannot be used with `new`. To accept "any concrete subclass", use a
construct signature; `abstract new (...)` describes constructors of abstract classes too:

```ts
function build(ShapeClass: new (size: number) => Shape, size: number): Shape {
  return new ShapeClass(size);
}
```

## Pitfall

Do not call abstract methods from the base **constructor**. The base constructor runs before the subclass
fields are initialized, so the subclass implementation may read `undefined`.
