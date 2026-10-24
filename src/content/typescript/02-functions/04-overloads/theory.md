## When one signature is not enough

Some functions return different types depending on **how** they are called. A union signature loses that relationship:

```ts
function parse(input: string | string[]): number | number[] { /* ... */ }

const single = parse('42');      // number | number[]  (but we know it is a number!)
```

**Function overloads** let you list several call signatures for one implementation:

```ts
function parse(input: string): number;            // overload 1
function parse(input: string[]): number[];        // overload 2
function parse(input: string | string[]): number | number[] {   // implementation
  return Array.isArray(input) ? input.map(Number) : Number(input);
}

const single = parse('42');          // number
const many = parse(['1', '2']);      // number[]
```

## The rules

1. **Overload signatures** have no body. Callers only see these.
2. The **implementation signature** comes last and must be compatible with every overload (usually via unions and optional parameters). It is **not visible** from outside:

```ts
parse(Math.random() > 0.5 ? '1' : ['1']);
// Error: No overload matches this call.
// The argument is string | string[], but no single overload accepts the union.
```

3. Overloads are checked **top to bottom**, and the first match wins. Put more specific signatures first.
4. The compiler only checks that the implementation is *compatible* with the overloads; it does not verify that each branch returns what its overload promises. Test each overload.

## Overloads for different arities

Overloads also express "1 or 3 arguments, but never 2":

```ts
function makeDate(timestamp: number): Date;
function makeDate(year: number, month: number, day: number): Date;
function makeDate(yearOrTimestamp: number, month?: number, day?: number): Date {
  if (month !== undefined && day !== undefined) {
    return new Date(yearOrTimestamp, month, day);
  }
  return new Date(yearOrTimestamp);
}

makeDate(0);             // ok
makeDate(2024, 0, 31);   // ok
makeDate(2024, 0);       // Error: No overload expects 2 arguments
```

A single signature with optional parameters would happily accept the broken two-argument call.

## Overloads in types

Object types and interfaces express overloads as multiple call signatures, and classes can overload methods the same way:

```ts
interface Parser {
  (input: string): number;
  (input: string[]): number[];
}

class Store {
  get(id: number): string | undefined;
  get(ids: number[]): string[];
  get(idOrIds: number | number[]) { /* ... */ }
}
```

Many built-in APIs use overloads, for example `Array.prototype.reduce` has signatures with and without the initial value.

## Prefer simpler tools when possible

The TypeScript handbook gives a clear rule: **prefer union parameters over overloads when the return type does not change**.

```ts
// Unnecessary overloads
function len(s: string): number;
function len(arr: unknown[]): number;

// Better
function len(value: string | unknown[]): number {
  return value.length;
}
```

The union version also accepts `string | unknown[]` arguments, which the overloaded one rejects. When the return type depends on the input in a regular way, generics or conditional types (later modules) often replace a long overload list.

## Pitfalls

- Forgetting that the implementation signature is hidden, and then wondering why a union argument fails.
- Ordering a general overload (`(input: unknown): string`) before a specific one: the specific one becomes unreachable.
- Writing overloads whose implementation returns the wrong shape; the compiler cannot catch it.
