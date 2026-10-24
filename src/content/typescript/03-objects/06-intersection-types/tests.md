## pattern: CustomerRecord is built with an intersection

```regex
type\s+CustomerRecord\s*=[^;]*&
```

## type: CustomerRecord has every member of the three types

```ts
type _ = [
  Expect<Equal<keyof CustomerRecord, 'id' | 'createdBy' | 'updatedAt' | 'name' | 'email'>>,
  Expect<Extends<CustomerRecord, Identified>>,
  Expect<Extends<CustomerRecord, Audited>>,
  Expect<Extends<CustomerRecord, Customer>>,
];
```

## type: ConflictingStatus is never

```ts
type _ = Expect<Equal<ConflictingStatus, never>>;
```

## runtime: createCustomerRecord builds the full record

```js
const now = new Date('2024-01-15T12:00:00Z');
const record = createCustomerRecord({ name: 'Ana', email: 'Ana@Example.com' }, 'admin', now);
assert.deepEqual(record, { id: 'customer-ana@example.com', name: 'Ana', email: 'Ana@Example.com', createdBy: 'admin', updatedAt: now });
```
