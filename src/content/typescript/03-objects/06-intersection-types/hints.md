Chain the three types with `&`: `type CustomerRecord = Identified & Audited & Customer;`.
---
Spread the customer and add the other fields: `{ ...customer, id: ..., createdBy: author, updatedAt: now }`.
---
No value is both a `string` and a `number`. You can write the answer directly or use an indexed access type: `({ status: string } & { status: number })["status"]`.
