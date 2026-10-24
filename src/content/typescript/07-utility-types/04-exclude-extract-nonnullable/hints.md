`AppEvent['type']` gives the union of discriminants. `Extract<AppEvent, { type: 'click' }>` keeps the members assignable to that shape.
---
`Boolean(item)` also removes `0`, `''` and `false`. Compare explicitly with `null` and `undefined` instead.
---
In generic code, write the predicate yourself: `items.filter((item): item is NonNullable<T> => item !== null && item !== undefined)`. Do the same with `event is ClickEvent` in `clicksOnly`.
