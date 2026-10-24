## type: Getters renames keys and keeps value types

```ts
type User = { name: string; age: number; isAdmin: boolean };
type _ = Expect<Equal<Getters<User>, { getName: () => string; getAge: () => number; getIsAdmin: () => boolean }>>;
```

## type: Getters ignores symbol keys

```ts
const tag = Symbol('tag');
type Tagged = { id: number; [tag]: string };
type _ = Expect<Equal<Getters<Tagged>, { getId: () => number }>>;
```

## type: PickByValue filters properties by value type

```ts
type Product = { id: number; title: string; price: number; tags: string[]; onSale: boolean };
type _ = [
  Expect<Equal<PickByValue<Product, number>, { id: number; price: number }>>,
  Expect<Equal<PickByValue<Product, string | boolean>, { title: string; onSale: boolean }>>,
  Expect<Equal<PickByValue<Product, Date>, {}>>,
];
```

## type: EventHandlers maps each event variant to its own handler

```ts
type AppEvent =
  | { type: 'login'; userId: number }
  | { type: 'logout' }
  | { type: 'pageView'; path: string };
type _ = Expect<Equal<EventHandlers<AppEvent>, {
  onLogin: (event: { type: 'login'; userId: number }) => void;
  onLogout: (event: { type: 'logout' }) => void;
  onPageView: (event: { type: 'pageView'; path: string }) => void;
}>>;
```

## type: createGetters returns typed getters

```ts
const getters = createGetters({ name: 'Ada', age: 36 });
type _ = Expect<Equal<typeof getters, { getName: () => string; getAge: () => number }>>;
// @ts-expect-error
getters.name;
```

## runtime: createGetters reads the current values

```js
const user = { name: 'Ada', age: 36 };
const getters = createGetters(user);
assert.deepEqual(Object.keys(getters).sort(), ['getAge', 'getName']);
assert.equal(getters.getName(), 'Ada');
user.age = 37;
assert.equal(getters.getAge(), 37);
```

## forbid: Does not use any

```regex
\bany\b
```
