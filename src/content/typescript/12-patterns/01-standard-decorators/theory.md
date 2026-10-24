## Decorators are functions applied to class elements

A decorator is a function that runs **once, when the class is defined**, and can observe or replace the element it decorates. TypeScript 5.0 implemented the **standard** (TC39 Stage 3) decorators, which need no compiler flag and are the ones to use in new code:

```ts
function logged<This, Args extends unknown[], Return>(
  target: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>,
) {
  const name = String(context.name);
  return function (this: This, ...args: Args): Return {
    console.log(`→ ${name}(${args.join(', ')})`);
    return target.call(this, ...args);
  };
}

class Calculator {
  @logged
  add(a: number, b: number) {
    return a + b;
  }
}
```

Every decorator receives two arguments:

1. **`target`**: the decorated value (the method function, the class, the getter...). Fields receive `undefined` because they have no value yet.
2. **`context`**: an object describing the element, typed per kind.

| Kind | Context type | May return |
| --- | --- | --- |
| class | `ClassDecoratorContext` | a replacement class |
| method | `ClassMethodDecoratorContext` | a replacement method |
| getter / setter | `ClassGetterDecoratorContext` / `ClassSetterDecoratorContext` | a replacement accessor |
| field | `ClassFieldDecoratorContext` | an initializer `(initial) => newInitial` |
| `accessor` field | `ClassAccessorDecoratorContext` | `{ get?, set?, init? }` |

The context exposes `kind`, `name`, `static`, `private`, `access` (to read or write the element on an instance) and `addInitializer`. Typing `target` and `context` precisely makes TypeScript reject the decorator on elements it does not support.

## Decorator factories

A decorator that needs configuration is a function that **returns** a decorator:

```ts
function retry(times: number) {
  return function <This, Args extends unknown[], Return>(
    target: (this: This, ...args: Args) => Promise<Return>,
    context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Promise<Return>>,
  ) {
    return async function (this: This, ...args: Args): Promise<Return> {
      for (let attempt = 1; ; attempt++) {
        try {
          return await target.call(this, ...args);
        } catch (error) {
          if (attempt >= times) throw error;
        }
      }
    };
  };
}
```

## addInitializer

`context.addInitializer(fn)` registers code that runs for **each instance** during construction (or once for static elements and classes). The classic use is auto-binding, so a method can be passed as a callback without losing `this`:

```ts
context.addInitializer(function () {
  this[context.name] = this[context.name].bind(this); // simplified
});
```

## Auto-accessors

The `accessor` keyword creates a private storage slot plus a getter and setter. Decorating it lets you intercept reads and writes, the building block for validation, observability and signals:

```ts
function positive<This>(
  target: ClassAccessorDecoratorTarget<This, number>,
  context: ClassAccessorDecoratorContext<This, number>,
): ClassAccessorDecoratorResult<This, number> {
  return {
    set(value) {
      if (value < 0) throw new RangeError(`${String(context.name)} must be positive`);
      target.set.call(this, value);
    },
  };
}

class Account {
  @positive accessor balance = 0;
}
```

`init(value)` in the result can transform the initial value as well.

## Order of evaluation

Decorator expressions are evaluated top to bottom, then applied **bottom to top** (closest to the element first). Method and accessor decorators run before class decorators.

## Metadata

`context.metadata` is an object shared by all decorators of a class and exposed as `MyClass[Symbol.metadata]`. It replaces the `reflect-metadata` hacks of legacy decorators, but needs `Symbol.metadata` at runtime (polyfill it where missing).

## Pitfalls

- Standard decorators **cannot decorate parameters**. Frameworks that inject through `constructor(@Inject(TOKEN) x)` still rely on legacy decorators.
- They are not interchangeable with `experimentalDecorators`: the signatures differ completely. Libraries must ship one flavor or the other.
- A replacement method must keep `this` typed with a `this` parameter and call the original with `target.call(this, ...)`.
- Decorators run at class definition time, not per call. Per-instance state belongs in a `WeakMap` keyed by `this` or in an initializer.
