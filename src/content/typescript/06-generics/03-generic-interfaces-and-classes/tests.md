## type: Page is a generic interface

```ts
type User = { id: number; name: string };
type _ = [
  Expect<Equal<Page<User>['items'], User[]>>,
  Expect<Equal<Page<User>['total'], number>>,
  Expect<Equal<ReturnType<Repository<User>['paginate']>, Page<User>>>,
];
```

## type: Repository methods use the item type

```ts
type User = { id: number; name: string };
const users = new Repository<User>();
const found = users.findById(1);
type _ = [
  Expect<Equal<typeof found, User | undefined>>,
  Expect<Equal<ReturnType<Repository<User>['all']>, readonly User[]>>,
];
// @ts-expect-error name is missing
users.add({ id: 2 });
users.where((user) => user.name.startsWith('A'));
```

## type: Items must have a numeric id

```ts
// @ts-expect-error id is required by the constraint
new Repository<{ name: string }>();
```

## runtime: add, findById and all

```js
const repository = new Repository();
repository.add({ id: 1, name: 'Ada' });
repository.add({ id: 2, name: 'Alan' });
repository.add({ id: 1, name: 'Ada Lovelace' });
assert.equal(repository.findById(1).name, 'Ada Lovelace');
assert.equal(repository.findById(9), undefined);
assert.deepEqual(repository.all().map((user) => user.id), [1, 2]);
```

## runtime: where filters and paginate slices pages

```js
const repository = new Repository();
['Ada', 'Alan', 'Grace', 'Linus', 'Margaret'].forEach((name, index) => repository.add({ id: index + 1, name }));
assert.deepEqual(repository.where((user) => user.name.startsWith('A')).map((user) => user.id), [1, 2]);
assert.deepEqual(repository.paginate(2, 2), { items: [{ id: 3, name: 'Grace' }, { id: 4, name: 'Linus' }], page: 2, total: 5 });
assert.deepEqual(repository.paginate(3, 2).items, [{ id: 5, name: 'Margaret' }]);
assert.deepEqual(repository.paginate(4, 2).items, []);
```
