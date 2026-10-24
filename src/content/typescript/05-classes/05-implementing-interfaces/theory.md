`implements` asks the compiler to check that a class satisfies one or more interfaces (or object type
aliases). It is a **contract check at the declaration**, nothing more.

```ts
interface Logger {
  log(message: string): void;
  readonly entries: string[];
}

interface Flushable {
  flush(): number;
}

class MemoryLogger implements Logger, Flushable {
  readonly entries: string[] = [];

  log(message: string): void {
    this.entries.push(message);
  }

  flush(): number {
    const count = this.entries.length;
    this.entries.length = 0;
    return count;
  }
}
```

Forget `flush` and the error appears right on the class: *"Class 'MemoryLogger' incorrectly implements
interface 'Flushable'. Property 'flush' is missing"*. Without `implements` you would only find out where an
instance is passed to a function expecting a `Flushable`.

## What `implements` does **not** do

1. **It does not change the class type.** The class type is still built from its own members. Extra members
   are fine, and optional interface members are not added to the class automatically.
2. **It does not contextually type method parameters.** This surprises everybody:

```ts
interface Parser {
  parse(input: string): number;
}

class IntParser implements Parser {
  parse(input) {            // error under strict: Parameter 'input' implicitly has an 'any' type
    return Number.parseInt(input, 10);
  }
}
```

Annotate parameters in classes even when the interface already declares them.

3. **It does not exist at runtime.** Interfaces are erased, so you cannot write
   `value instanceof Logger`. Use a type predicate or an abstract class when you need a runtime check.

## Classes and interfaces are structural

Because typing is structural, `implements` is optional: any object with the right shape is a `Logger`,
including plain object literals. Use `implements` when you want the class author (not the consumer) to get
the error, and to document intent.

```ts
const consoleLogger: Logger = { entries: [], log: (message) => console.log(message) };
```

## Instance side vs static side

An interface listed in `implements` describes **instances** only. The constructor and static members belong
to the class value, `typeof MemoryLogger`. To describe them, write a separate interface with a **construct
signature** and check the class by assigning it:

```ts
interface LoggerConstructor {
  new (prefix?: string): Logger;
}

const LoggerClass: LoggerConstructor = MemoryLogger; // checks the constructor side
const logger = new LoggerClass();
```

Writing `class MemoryLogger implements LoggerConstructor` would be wrong: it would ask instances to be
constructible.

## Pitfalls

- A class can `extends` one class and `implements` many interfaces: `class A extends Base implements X, Y`.
- An interface can extend a class and inherit its `private` members, which then only that class hierarchy
  can implement. This is rare; prefer plain interfaces.
- `readonly` in the interface does not stop the class from declaring the property as mutable.
