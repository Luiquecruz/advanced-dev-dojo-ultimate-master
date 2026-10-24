## type: Derived types have the right keys

```ts
type _ = [
  Expect<Equal<keyof PublicUser, 'id' | 'name' | 'email' | 'createdAt' | 'role'>>,
  Expect<Equal<keyof UserPreview, 'id' | 'name'>>,
  Expect<Equal<keyof NewUser, 'name' | 'email' | 'passwordHash' | 'role'>>,
  Expect<Equal<PublicUser['createdAt'], Date>>,
];
```

## pattern: Uses Pick and Omit

```regex
Pick\s*<\s*User[\s\S]*Omit\s*<\s*User|Omit\s*<\s*User[\s\S]*Pick\s*<\s*User
```

## runtime: toPublicUser drops the password hash

```js
const user = { id: 1, name: 'Ada', email: 'ada@example.com', passwordHash: 'x9!', createdAt: new Date(0), role: 'admin' };
const publicUser = toPublicUser(user);
assert.ok(!('passwordHash' in publicUser));
assert.deepEqual(Object.keys(publicUser).sort(), ['createdAt', 'email', 'id', 'name', 'role']);
assert.equal(user.passwordHash, 'x9!');
```

## runtime: toPreview keeps only id and name

```js
const user = { id: 2, name: 'Alan', email: 'alan@example.com', passwordHash: 'h', createdAt: new Date(0), role: 'member' };
assert.deepEqual(toPreview(user), { id: 2, name: 'Alan' });
```

## runtime: createUser adds the generated fields

```js
const createdAt = new Date(1000);
const user = createUser({ name: 'Grace', email: 'grace@example.com', passwordHash: 'h', role: 'member' }, 3, createdAt);
assert.deepEqual(user, { name: 'Grace', email: 'grace@example.com', passwordHash: 'h', role: 'member', id: 3, createdAt });
```
