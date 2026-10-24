## type: STATUS_LABELS is an exhaustive Record

```ts
type _ = [
  Expect<Equal<keyof typeof STATUS_LABELS, Status>>,
  Expect<Equal<(typeof STATUS_LABELS)['done'], string>>,
];
```

## type: groupByStatus returns optional groups

```ts
type _ = Expect<Equal<ReturnType<typeof groupByStatus>, Partial<Record<Status, Task[]>>>>;
const groups = groupByStatus([]);
// @ts-expect-error a group may be missing
groups.done.length;
```

## runtime: STATUS_LABELS has every label

```js
assert.deepEqual(STATUS_LABELS, { todo: 'To do', 'in-progress': 'In progress', done: 'Done' });
```

## runtime: countByStatus includes zero counts

```js
const tasks = [
  { title: 'Plan', status: 'done' },
  { title: 'Build', status: 'in-progress' },
  { title: 'Test', status: 'in-progress' },
];
assert.deepEqual(countByStatus(tasks), { todo: 0, 'in-progress': 2, done: 1 });
assert.deepEqual(countByStatus([]), { todo: 0, 'in-progress': 0, done: 0 });
```

## runtime: groupByStatus only creates used groups

```js
const plan = { title: 'Plan', status: 'done' };
const build = { title: 'Build', status: 'todo' };
const ship = { title: 'Ship', status: 'todo' };
assert.deepEqual(groupByStatus([plan, build, ship]), { done: [plan], todo: [build, ship] });
assert.deepEqual(groupByStatus([]), {});
```

## runtime: indexBy builds a dictionary

```js
const users = [{ id: 'a', name: 'Ada' }, { id: 'b', name: 'Alan' }, { id: 'a', name: 'Ada L.' }];
assert.deepEqual(indexBy(users, (user) => user.id), { a: { id: 'a', name: 'Ada L.' }, b: { id: 'b', name: 'Alan' } });
```
