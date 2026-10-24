## type: A single id returns User | undefined

```ts
const user = lookupUser(1);
type _ = Expect<Equal<typeof user, User | undefined>>;
```

## type: An array of ids returns User[]

```ts
const list = lookupUser([1, 2]);
type _ = Expect<Equal<typeof list, User[]>>;
const frozen: readonly number[] = [3];
lookupUser(frozen);
```

## type: The implementation signature is not callable

```ts
const idOrIds: number | number[] = Math.random() > 0.5 ? 1 : [1];
// @ts-expect-error
lookupUser(idOrIds);
```

## runtime: lookupUser finds users by id

```js
assert.deepEqual(lookupUser(2), { id: 2, name: 'Alan Turing' }); assert.equal(lookupUser(9), undefined); assert.deepEqual(lookupUser([3, 9, 1]).map((user) => user.name), ['Grace Hopper', 'Ada Lovelace']); assert.deepEqual(lookupUser([]), []);
```

## type: makeDate takes one or three arguments, never two

```ts
makeDate(0);
makeDate(2024, 0, 31);
// @ts-expect-error
makeDate(2024, 0);
```

## runtime: makeDate builds dates from both forms

```js
assert.equal(makeDate(0).getTime(), 0); const date = makeDate(2024, 0, 31); assert.equal(date.getFullYear(), 2024); assert.equal(date.getMonth(), 0); assert.equal(date.getDate(), 31);
```
