## type: JsonValue accepts nested JSON and rejects non-JSON values

```ts
const config: JsonValue = { name: 'app', ports: [80, 443], tls: { enabled: true, cert: null }, tags: [['a'], []] };
const list: JsonValue = [1, 'two', false, { three: [3] }];
// @ts-expect-error
const withUndefined: JsonValue = { missing: undefined };
// @ts-expect-error
const withDate: JsonValue = { createdAt: new Date() };
// @ts-expect-error
const withFunction: JsonValue = [() => 1];
```

## type: TreeNode is recursive

```ts
type _ = Expect<Equal<TreeNode<string>['children'], TreeNode<string>[]>>;
const tree: TreeNode<number> = { value: 1, children: [{ value: 2, children: [] }] };
// @ts-expect-error
const wrong: TreeNode<number> = { value: 1, children: [{ value: 'two', children: [] }] };
```

## type: DeepElement unwraps every array level

```ts
type _ = [
  Expect<Equal<DeepElement<number[][][]>, number>>,
  Expect<Equal<DeepElement<string[]>, string>>,
  Expect<Equal<DeepElement<readonly (readonly boolean[])[]>, boolean>>,
  Expect<Equal<DeepElement<Date>, Date>>,
];
```

## type: Trim removes leading and trailing spaces

```ts
type _ = [
  Expect<Equal<Trim<'  hi  '>, 'hi'>>,
  Expect<Equal<Trim<'hello world'>, 'hello world'>>,
  Expect<Equal<Trim<'   left'>, 'left'>>,
  Expect<Equal<Trim<'right    '>, 'right'>>,
  Expect<Equal<Trim<'   '>, ''>>,
];
```

## runtime: flattenTree walks the tree depth-first

```js
const tree = {
  value: 'root',
  children: [
    { value: 'a', children: [{ value: 'a1', children: [] }, { value: 'a2', children: [] }] },
    { value: 'b', children: [] },
  ],
};
assert.deepEqual(flattenTree(tree), ['root', 'a', 'a1', 'a2', 'b']);
assert.deepEqual(flattenTree({ value: 1, children: [] }), [1]);
```

## forbid: Does not use any

```regex
\bany\b
```
