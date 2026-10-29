## type: resolve() returns the type each factory produced

```ts
const container = createContainer();
const signup = container.resolve('signup');
const clock = container.resolve('clock');
type _1 = Expect<Equal<typeof signup, SignupService>>;
type _2 = Expect<Equal<typeof clock, Clock>>;
// @ts-expect-error
container.resolve('mailer');
```

## type: factories can only resolve services registered before them

```ts
new Container()
  .register('clock', (): Clock => ({ now: () => 0 }))
  .register('reader', (resolve) => resolve('clock').now());
// @ts-expect-error
new Container().register('reader', (resolve) => resolve('clock'));
```

## type: a key cannot be registered twice

```ts
const base = new Container().register('clock', (): Clock => ({ now: () => 0 }));
// @ts-expect-error
base.register('clock', (): Clock => ({ now: () => 1 }));
```

## runtime: singletons are created lazily once, transients on every resolve

```js
let created = 0;
const container = new Container()
  .register('counter', () => ({ id: ++created }))
  .register('fresh', () => ({ id: ++created }), { lifetime: 'transient' });
assert.equal(created, 0);
assert.equal(container.resolve('counter'), container.resolve('counter'));
assert.notEqual(container.resolve('fresh'), container.resolve('fresh'));
assert.equal(created, 3);
const app = createContainer();
assert.notEqual(app.resolve('signup'), app.resolve('signup'));
assert.equal(app.resolve('logger'), app.resolve('logger'));
```

## runtime: register returns a new container and rejects duplicate or missing keys

```js
const base = new Container().register('clock', () => ({ now: () => 7 }));
const extended = base.register('logger', () => ({ lines: [], info() {} }));
assert.notEqual(base, extended);
assert.throws(() => base.resolve('logger'), /Service "logger" is not registered/);
assert.equal(extended.resolve('clock').now(), 7);
assert.throws(() => base.register('clock', () => ({ now: () => 1 })), /Service "clock" is already registered/);
```

## runtime: services resolve their dependencies through the container

```js
const container = new Container()
  .register('clock', () => ({ now: () => 42 }))
  .register('logger', () => { const lines = []; return { lines, info: (message) => lines.push(message) }; })
  .register('signup', (resolve) => new SignupService(resolve('clock'), resolve('logger')));
assert.deepEqual(container.resolve('signup').signup('ada@example.com'), { email: 'ada@example.com', createdAt: 42 });
assert.deepEqual(container.resolve('logger').lines, ['signup ada@example.com']);
```

## forbid: does not use any

```regex
\bany\b
```
