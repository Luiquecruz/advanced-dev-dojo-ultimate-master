## pattern: Uses NoInfer

```regex
NoInfer\s*<
```

## type: initial must be one of the states

```ts
const light = createStateMachine(['red', 'yellow', 'green'], 'red');
type _ = Expect<Equal<typeof light.current, 'red' | 'yellow' | 'green'>>;
// @ts-expect-error blue is not a state
createStateMachine(['red', 'yellow', 'green'], 'blue');
// @ts-expect-error transitions are checked too
light.transition('blue');
```

## type: fallback must be one of the allowed options

```ts
const input: string = 'up';
const order = parseOption(['asc', 'desc'], input, 'asc');
type _ = Expect<Equal<typeof order, 'asc' | 'desc'>>;
// @ts-expect-error random is not an allowed option
parseOption(['asc', 'desc'], input, 'random');
```

## runtime: The state machine records transitions

```js
const machine = createStateMachine(['idle', 'loading', 'done'], 'idle');
assert.equal(machine.current, 'idle');
machine.transition('loading');
machine.transition('done');
assert.equal(machine.current, 'done');
assert.deepEqual(machine.history(), ['idle', 'loading', 'done']);
```

## runtime: Unknown states throw at runtime

```js
const machine = createStateMachine(['on', 'off'], 'off');
assert.throws(() => machine.transition('broken'), 'Unknown state');
assert.deepEqual(machine.history(), ['off']);
```

## runtime: parseOption returns the input or the fallback

```js
assert.equal(parseOption(['asc', 'desc'], 'desc', 'asc'), 'desc');
assert.equal(parseOption(['asc', 'desc'], 'up', 'asc'), 'asc');
```
