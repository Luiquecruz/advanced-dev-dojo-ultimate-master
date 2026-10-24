1. Declare a type alias `ShippingAddress` with:
   - `street`, `city` and `postalCode` — required `string` properties
   - `complement` — an **optional** `string`
2. Implement `formatAddress(address: ShippingAddress): string`:
   - without complement: `"<street>, <city> <postalCode>"`
   - with complement: `"<street> (<complement>), <city> <postalCode>"`

```ts
formatAddress({ street: '742 Evergreen Terrace', city: 'Springfield', postalCode: '49007' });
// "742 Evergreen Terrace, Springfield 49007"
formatAddress({ street: '742 Evergreen Terrace', city: 'Springfield', postalCode: '49007', complement: 'Apt 2' });
// "742 Evergreen Terrace (Apt 2), Springfield 49007"
```
