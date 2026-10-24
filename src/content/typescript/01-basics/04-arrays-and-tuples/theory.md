## Arrays

An array type lists the type of its elements. There are two equivalent spellings:

```ts
const scores: number[] = [10, 20, 30];
const names: Array<string> = ['Ada', 'Alan'];
```

`T[]` is the common style. `Array<T>` reads better for complex element types such as `Array<string | number>`, because `string | number[]` means "a string, or an array of numbers".

### Readonly arrays

A `readonly T[]` (or `ReadonlyArray<T>`) removes every mutating method (`push`, `pop`, `splice`, `sort`, `reverse`) and index assignment from the type:

```ts
function highest(values: readonly number[]): number {
  values.sort();                 // Error: Property 'sort' does not exist on type 'readonly number[]'
  return Math.max(...values);
}
```

Use `readonly` on parameters you do not intend to change: callers can pass both mutable and readonly arrays, and the signature promises you will not mutate their data. To sort without mutating, copy first (`[...values].sort()`) or use the non-mutating `toSorted()` added in ES2023.

## Tuples

A **tuple** is an array with a fixed length where each position has its own type:

```ts
let entry: [string, number] = ['Ada', 42];
entry = [42, 'Ada'];   // Error: types are checked per position
entry[2];              // Error: Tuple type '[string, number]' of length '2' has no element at index '2'

const [name, score] = entry; // name: string, score: number
```

Tuples are how functions return several values without inventing an object type, e.g. `useState` in React returns `[value, setValue]`.

### Labels, optional and rest elements

```ts
type Range = [start: number, end: number];              // labels document each position
type Point = [x: number, y: number, z?: number];         // optional last element, length 2 | 3
type Command = [name: string, ...args: string[]];        // rest element, any length >= 1
type Pair = readonly [key: string, value: string];       // no mutation at all
```

Labels have no effect on assignability; they only show up in editor tooltips and error messages, which makes them free documentation.

## Inference does not create tuples

An array literal is inferred as an **array**, never a tuple:

```ts
const pair = ['Ada', 42];         // (string | number)[]
const tuple: [string, number] = ['Ada', 42];
const frozen = ['Ada', 42] as const; // readonly ["Ada", 42]
```

When a function returns a tuple, give it an explicit return type, otherwise callers receive a loose union array and lose per-position types.

## Pitfalls

- **Mutable tuples are still arrays at runtime.** `entry.push('extra')` compiles on a non-readonly tuple. Prefer `readonly` tuples for values that should never change shape.
- **Index access is optimistic.** `scores[99]` is typed `number` even though it is `undefined` at runtime. The `noUncheckedIndexedAccess` compiler option adds `| undefined` to index reads for safer code.
- **`sort` mutates.** Sorting a parameter in place silently changes the caller's array. Readonly parameter types catch this mistake.
