Type parameters are not limited to functions. Interfaces, type aliases and classes can be generic too, and
you already use many of them: `Array<T>`, `Promise<T>`, `Map<K, V>`, `Set<T>`.

## Generic interfaces and type aliases

```ts
interface ApiPage<T> {
  items: T[];
  total: number;
  nextCursor: string | null;
}

type Pair<A, B> = [first: A, second: B];

type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

const page: ApiPage<{ id: number; title: string }> = { items: [], total: 0, nextCursor: null };
```

A generic type is like a function at the type level: `ApiPage` alone is not a type, `ApiPage<User>` is.
Unlike functions, **type arguments of generic types are never inferred from a value annotation**: you must
write `ApiPage<User>`.

Interfaces can also have **generic methods** whose type parameter is chosen per call:

```ts
interface Collection<T> {
  add(item: T): void;
  map<U>(transform: (item: T) => U): Collection<U>;
}
```

## Generic classes

A class type parameter is available to every instance member:

```ts
class Stack<T> {
  #items: T[] = [];

  push(item: T): void {
    this.#items.push(item);
  }

  pop(): T | undefined {
    return this.#items.pop();
  }

  peek(): T | undefined {
    return this.#items.at(-1);
  }
}

const numbers = new Stack<number>();
numbers.push(1);
numbers.push('2');               // error: string is not assignable to number

const inferred = new Stack();    // Stack<unknown>: nothing to infer from!
```

When the constructor receives a `T`, TypeScript infers it (`new Box('hello')` is `Box<string>`). With no
constructor argument, pass the type explicitly or you get `Stack<unknown>`.

## Constraints on classes

```ts
class Repository<T extends { id: number }> {
  #items = new Map<number, T>();
  save(item: T): void {
    this.#items.set(item.id, item);   // item.id is allowed thanks to the constraint
  }
}
```

## Static members cannot use `T`

There is one class object shared by `Stack<number>` and `Stack<string>`, so a static member cannot depend on
the instance type parameter:

```ts
class Stack<T> {
  static empty: T[] = [];   // error: Static members cannot reference class type parameters
}
```

Use a generic static method instead: `static of<U>(...items: U[]): Stack<U>`.

## Pitfalls

- Generic types are **erased**. At runtime there is only one `Stack` class, so you cannot check
  `value instanceof Stack<number>` or read `T` inside the class.
- Avoid exposing the internal array directly from a generic container; return a copy or a
  `readonly T[]` so callers cannot bypass your methods.
- Prefer a generic interface for the public contract and a class for the implementation; consumers can then
  depend on `Collection<T>` instead of a concrete class.
