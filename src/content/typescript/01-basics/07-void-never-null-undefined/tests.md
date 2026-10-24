## type: findUser returns User | undefined

```ts
type _ = Expect<Equal<ReturnType<typeof findUser>, User | undefined>>;
```

## runtime: findUser finds by id or returns undefined

```js
const users = [{ id: 1, name: 'Ada' }, { id: 2, name: 'Alan' }]; assert.equal(findUser(users, 2), users[1]); assert.equal(findUser(users, 9), undefined);
```

## runtime: displayName falls back from nickname to name to "Guest"

```js
assert.equal(displayName({ id: 1, name: 'Grace', nickname: 'Amazing Grace' }), 'Amazing Grace'); assert.equal(displayName({ id: 1, name: 'Grace' }), 'Grace'); assert.equal(displayName(undefined), 'Guest');
```

## runtime: retryCount keeps 0 and defaults to 3

```js
assert.equal(retryCount({ retries: 0 }), 0); assert.equal(retryCount({ retries: 5 }), 5); assert.equal(retryCount({}), 3); assert.equal(retryCount(null), 3);
```

## type: fail returns never

```ts
type _ = Expect<Equal<ReturnType<typeof fail>, never>>;
const port: number = fail('missing');
```

## forbid: Does not use non-null assertions

```regex
[\w)\]]!(?!=)
```
