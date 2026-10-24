## type: formatName's last name is optional

```ts
formatName('Ada');
formatName('Ada', 'Lovelace');
type _ = Expect<Equal<Parameters<typeof formatName>, [first: string, last?: string]>>;
```

## type: repeatText has optional, default-typed parameters

```ts
type _ = Expect<Equal<Parameters<typeof repeatText>, [text: string, times?: number, separator?: string]>>;
```

## runtime: repeatText respects defaults and falsy values

```js
assert.equal(repeatText('ha'), 'ha ha'); assert.equal(repeatText('ha', 3, '-'), 'ha-ha-ha'); assert.equal(repeatText('ha', 0), ''); assert.equal(repeatText('ab', 2, ''), 'abab');
```

## type: sum accepts any number of numbers

```ts
sum();
sum(1);
sum(1, 2, 3);
// @ts-expect-error
sum('1');
```

## runtime: formatName and sum return the expected values

```js
assert.equal(formatName('Ada'), 'Ada'); assert.equal(formatName('Ada', 'Lovelace'), 'Ada Lovelace'); assert.equal(sum(), 0); assert.equal(sum(4), 4); assert.equal(sum(1, 2, 3), 6);
```
