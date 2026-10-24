## type: Impossible states are rejected

```ts
const idle: RequestState = { status: 'idle' };
const done: RequestState = { status: 'success', data: [] };
// @ts-expect-error
const missingData: RequestState = { status: 'success' };
// @ts-expect-error
const loadingWithError: RequestState = { status: 'loading', error: 'x' };
// @ts-expect-error
const missingError: RequestState = { status: 'error' };
```

## type: Each member carries its own fields

```ts
type _success = Expect<Equal<Extract<RequestState, { status: 'success' }>['data'], string[]>>;
type _error = Expect<Equal<Extract<RequestState, { status: 'error' }>['error'], string>>;
type _status = Expect<Equal<RequestState['status'], 'idle' | 'loading' | 'success' | 'error'>>;
```

## runtime: Renders idle and loading states

```js
assert.equal(renderState({ status: 'idle' }), 'Nothing loaded yet'); assert.equal(renderState({ status: 'loading' }), 'Loading…');
```

## runtime: Renders success and error states

```js
assert.equal(renderState({ status: 'success', data: ['Keyboard', 'Mouse'] }), '2 items: Keyboard, Mouse'); assert.equal(renderState({ status: 'success', data: [] }), '0 items: '); assert.equal(renderState({ status: 'error', error: 'Timeout' }), 'Error: Timeout');
```

## forbid: Does not use non-null assertions

```regex
[\w)\]]!(?!=)
```
