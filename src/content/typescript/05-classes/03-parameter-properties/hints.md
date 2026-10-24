A constructor parameter becomes a field when it has a modifier: `constructor(readonly id: number, ...) {}`.
---
Delete the three field declarations and the three assignments. The constructor body ends up empty: `{}`.
---
For the discount: `this.priceInCents = Math.round(this.priceInCents * (1 - percent / 100));`. Writing to a `private` field from inside the class is allowed.
