A **class** bundles data (fields) and behavior (methods) and gives you a constructor to build instances.
TypeScript adds types to every part of it, and a class name works both as a **value** (the constructor
function you call with `new`) and as a **type** (the shape of its instances).

```ts
class Timer {
  label: string;          // field declaration with a type
  elapsedMs = 0;          // initializer: type inferred as number
  laps: number[] = [];    // each instance gets its own array

  constructor(label: string) {
    this.label = label;
  }

  lap(ms: number): void {
    this.elapsedMs += ms;
    this.laps.push(ms);
  }
}

const timer: Timer = new Timer('5k run'); // Timer as a type and as a value
timer.lap(1200);
```

## Fields must be initialized

Under `strict` (specifically `strictPropertyInitialization`) every field must be assigned either by an
initializer or **definitely** in the constructor. Otherwise you get *"Property 'label' has no initializer
and is not definitely assigned in the constructor"*.

```ts
class Session {
  token: string;          // error if the constructor does not assign it
  userId?: number;        // optional: may be undefined, no error
  startedAt!: Date;       // definite assignment assertion: "trust me, it is set elsewhere"
}
```

The `!` assertion turns the check off for one field. Use it only when something outside the constructor
(a framework, an `init()` method) really assigns it, because the compiler stops protecting you.

## Methods and `this`

Methods live on the prototype and read the instance through `this`. The classic pitfall is detaching a
method from its instance:

```ts
const lap = timer.lap;
lap(100); // runtime TypeError: this is undefined
```

Fixes: call it as `timer.lap(...)`, bind it (`timer.lap.bind(timer)`), or declare it as an arrow
function field (`lap = (ms: number) => { ... }`). Arrow fields capture `this` but are created **per
instance** instead of being shared on the prototype.

## Field semantics in modern TypeScript

With target `ES2022` or later, TypeScript emits real JavaScript class fields
(`useDefineForClassFields: true`). Fields are created with `Object.defineProperty` semantics **before**
the constructor body runs, in declaration order. Older targets compiled fields into plain assignments
inside the constructor. The difference only shows in edge cases (subclasses redeclaring fields), which you
will meet in the inheritance lesson.

## Classes are structural

TypeScript compares classes by shape, like any other object type. A plain object with the same public
members is assignable to `Timer`, even though it was never created with `new Timer()`. Use `instanceof`
when you need a runtime guarantee:

```ts
function isTimer(value: unknown): value is Timer {
  return value instanceof Timer;
}
```

## Pitfalls

- Initializing a field with a shared object outside the class (`laps = sharedArray`) makes every instance
  mutate the same array. Initializers like `= []` run once **per instance**, which is what you want.
- Forgetting `new` throws *"Class constructor cannot be invoked without 'new'"*; the compiler catches it.
- Do not reach for `!` to silence initialization errors; assign the field or make it optional.
