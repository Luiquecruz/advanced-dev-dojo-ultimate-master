## type: isUser is a type predicate

```ts
type _ = Expect<Equal<typeof isUser, (value: unknown) => value is User>>;
const input: unknown = JSON.parse('{"id":1,"name":"Ada"}');
if (isUser(input)) {
  const name: string = input.name;
}
```

## runtime: isUser accepts only well-formed users

```js
assert.equal(isUser({ id: 1, name: 'Ada' }), true); assert.equal(isUser({ id: 2, name: 'Alan', role: 'admin' }), true); assert.equal(isUser({ id: '1', name: 'Ada' }), false); assert.equal(isUser({ id: 1 }), false); assert.equal(isUser(null), false); assert.equal(isUser('Ada'), false);
```

## runtime: validUsers keeps valid users only

```js
const ada = { id: 1, name: 'Ada' }; assert.deepEqual(validUsers([ada, null, { id: 2 }, 'x']), [ada]); assert.deepEqual(validUsers([]), []);
```

## runtime: compact removes null and undefined but keeps empty strings

```js
assert.deepEqual(compact(['a', null, '', undefined, 'b']), ['a', '', 'b']);
```

## forbid: Does not use type assertions

```regex
\bas\s+\w
```
