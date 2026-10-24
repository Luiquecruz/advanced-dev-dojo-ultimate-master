## Function type expressions

Functions are values, so they need types too. A **function type expression** looks like an arrow function without a body:

```ts
type Comparator = (a: number, b: number) => number;

const ascending: Comparator = (a, b) => a - b;   // a and b are contextually typed
const descending: Comparator = (a, b) => b - a;

function sortWith(values: number[], compare: Comparator): number[] {
  return [...values].sort(compare);
}
```

When a function is assigned to a variable with a function type, its parameters are **contextually typed**, so you do not repeat the annotations.

### Pitfall: parameter names are mandatory

```ts
type Handler = (string) => void;
// This is a parameter *named* string with an implicit any type!
// strict mode reports: Parameter has a name but no type. Did you mean 'arg0: string'?
```

### Assignability: fewer parameters are fine

A function with **fewer** parameters can be used where more are provided, because JavaScript ignores extra arguments:

```ts
const onlyFirst: Comparator = (a) => a; // ok
[1, 2, 3].forEach((value) => console.log(value)); // forEach passes (value, index, array)
```

### Why not `Function`?

The global `Function` type accepts *any* function and every call on it returns `any`. It is the `any` of functions: no parameter checks, no return type. Always describe the actual signature instead.

## Call signatures

A function type expression cannot describe **properties** on the function. JavaScript functions are objects and often carry extra data (`fn.displayName`, a `cache`, a `unit`). For those, write a **call signature** inside an object type: parameters, a colon (not an arrow), and the return type.

```ts
type Formatter = {
  (value: number): string;   // call signature
  unit: string;              // regular property
};

function createFormatter(unit: string): Formatter {
  const format = (value: number) => `${value} ${unit}`;
  format.unit = unit;        // TypeScript tracks properties assigned to a const function
  return format;
}

const meters = createFormatter('m');
meters(5);        // "5 m"
meters.unit;      // "m"
```

The same syntax works in interfaces, and an object type can contain several call signatures (that is how overloads are typed, see the next lesson).

`Object.assign(fn, { unit })` is an alternative way to build such a value in one expression.

## Construct signatures

Add `new` in front of a call signature to describe something that is called with `new`, such as a class:

```ts
type PointConstructor = {
  new (x: number, y: number): { x: number; y: number };
};

function build(Ctor: PointConstructor) {
  return new Ctor(1, 2);
}
```

## Method vs property syntax

In object types, `compare(a: number, b: number): number` (method syntax) and `compare: (a: number, b: number) => number` (property syntax) look equivalent, but method parameters are checked **bivariantly** even under `strictFunctionTypes`, which is less safe. Prefer property syntax for callbacks you store.

| Syntax | Describes |
| --- | --- |
| `(x: T) => R` | a plain function |
| `{ (x: T): R; prop: P }` | a callable object with properties |
| `{ new (x: T): R }` | a constructor |
