## type: Union members are derived correctly

```ts
type _ = [
  Expect<Equal<EventType, 'click' | 'keypress' | 'scroll' | 'focus'>>,
  Expect<Equal<ClickEvent, { type: 'click'; x: number; y: number }>>,
  Expect<Equal<KeyboardOrFocusEvent, { type: 'keypress'; key: string } | { type: 'focus' }>>,
  Expect<Equal<NonClickEvent['type'], 'keypress' | 'scroll' | 'focus'>>,
];
```

## pattern: Uses Extract and Exclude

```regex
Extract\s*<[\s\S]*Exclude\s*<|Exclude\s*<[\s\S]*Extract\s*<
```

## type: compact removes null and undefined from the type

```ts
const mixed: (string | null | undefined)[] = ['a', null];
const strings = compact(mixed);
type _ = Expect<Equal<typeof strings, string[]>>;
const events: AppEvent[] = [];
const clicks = clicksOnly(events);
const x: number = clicks[0].x;
```

## runtime: compact keeps falsy values that are not nullish

```js
assert.deepEqual(compact([0, null, '', undefined, false, 'a']), [0, '', false, 'a']);
assert.deepEqual(compact([]), []);
```

## runtime: clicksOnly keeps only click events

```js
const events = [
  { type: 'click', x: 1, y: 2 },
  { type: 'focus' },
  { type: 'keypress', key: 'a' },
  { type: 'click', x: 3, y: 4 },
];
assert.deepEqual(clicksOnly(events), [{ type: 'click', x: 1, y: 2 }, { type: 'click', x: 3, y: 4 }]);
```
