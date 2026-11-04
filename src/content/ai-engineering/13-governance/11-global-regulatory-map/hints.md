`coversMarket` is one `some`: `market === jurisdiction || market.startsWith(`${jurisdiction}-`)`. The `-` is what keeps `AA` from covering `AAX`.
---
`matchesFeature` loops over the three keys with `every`: a key the condition does not set passes (`required === undefined`), and a set key passes when `required.some((value) => feature[key].includes(value))`.
---
In `mapObligations`, filter the rules by market first, then the features by condition, and compute the status in a small helper: bills are `'proposed'`; laws with `Date.parse(appliesFrom) > Date.parse(asOf)` are `'upcoming'`; everything else applies. Add `appliesFrom` only when the rule has it, and sort with `localeCompare` chained by `||`.
---
`summarize` creates `{ applies: 0, upcoming: 0, proposed: 0 }` the first time it sees a jurisdiction and increments by status. `checkFreshness` divides the difference of the two `Date.parse` values by one day and floors it.
