## type: ShippingAddress has the exact expected shape

```ts
type _ = Expect<Equal<ShippingAddress, { street: string; city: string; postalCode: string; complement?: string }>>;
```

## type: complement may be omitted but city may not

```ts
const minimal: ShippingAddress = { street: 'Main St', city: 'Austin', postalCode: '73301' };
// @ts-expect-error
const missingCity: ShippingAddress = { street: 'Main St', postalCode: '73301' };
```

## type: formatAddress takes a ShippingAddress and returns a string

```ts
type _ = Expect<Equal<typeof formatAddress, (address: ShippingAddress) => string>>;
```

## runtime: Formats an address without complement

```js
assert.equal(formatAddress({ street: '742 Evergreen Terrace', city: 'Springfield', postalCode: '49007' }), '742 Evergreen Terrace, Springfield 49007');
```

## runtime: Formats an address with complement

```js
assert.equal(formatAddress({ street: '742 Evergreen Terrace', city: 'Springfield', postalCode: '49007', complement: 'Apt 2' }), '742 Evergreen Terrace (Apt 2), Springfield 49007');
```

## forbid: Does not use any

```regex
\bany\b
```
