`Identified`, `Audited` and `Customer` are already declared.

1. Declare `type CustomerRecord` as the **intersection** of `Identified`, `Audited` and `Customer`.
2. Implement `createCustomerRecord(customer: Customer, author: string, now: Date): CustomerRecord`:
   - `id` is `"customer-"` followed by the **lowercased** email
   - `createdBy` is `author` and `updatedAt` is `now`
   - `name` and `email` are copied from `customer`
3. Declare `type ConflictingStatus` as the type of the `status` property of
   `{ status: string } & { status: number }` (think about what that type must be).

```ts
createCustomerRecord({ name: 'Ana', email: 'Ana@Example.com' }, 'admin', now);
// { id: 'customer-ana@example.com', name: 'Ana', email: 'Ana@Example.com', createdBy: 'admin', updatedAt: now }
```
