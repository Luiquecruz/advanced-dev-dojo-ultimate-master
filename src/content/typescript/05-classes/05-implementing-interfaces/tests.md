## pattern: MemoryCache implements both interfaces

```regex
class\s+MemoryCache\s+implements\s+(Cache\s*,\s*Serializable|Serializable\s*,\s*Cache)\b
```

## type: Instances satisfy Cache and Serializable

```ts
const cache = new MemoryCache();
const asCache: Cache = cache;
const asSerializable: Serializable = cache;
type _ = Expect<Equal<ReturnType<MemoryCache['get']>, string | undefined>>;
```

## type: The constructor side matches CacheConstructor

```ts
const ctor: CacheConstructor = MemoryCache;
const fromConstant: Cache = new CacheClass({ a: '1' });
// @ts-expect-error values must be strings
new MemoryCache({ a: 1 });
```

## runtime: get, set, has and size work

```js
const cache = new MemoryCache();
assert.equal(cache.has('theme'), false);
assert.equal(cache.get('theme'), undefined);
cache.set('theme', 'dark');
cache.set('theme', 'light');
cache.set('lang', 'en');
assert.equal(cache.get('theme'), 'light');
assert.equal(cache.has('lang'), true);
assert.equal(cache.size(), 2);
```

## runtime: The constructor preloads entries and serialize returns JSON

```js
const cache = new CacheClass({ a: '1', b: '2' });
assert.equal(cache.size(), 2);
assert.equal(cache.serialize(), '{"a":"1","b":"2"}');
assert.equal(new MemoryCache().serialize(), '{}');
```
