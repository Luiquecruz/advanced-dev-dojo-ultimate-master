`covers_market` is one `any`: `market == jurisdiction or market.startswith(f"{jurisdiction}-")`. The `-` is what keeps `AA` from covering `AAX`.
---
`matches_feature` loops over the three keys with `all`: a key the condition does not set passes (`key not in when`), and a set key passes when `any(value in feature[key] for value in when[key])`.
---
In `map_obligations`, filter the rules by market first, then the features by condition, and compute the status in a small helper: bills are `"proposed"`; laws with `parse_time_ms(applies_from) > parse_time_ms(as_of)` are `"upcoming"`; everything else applies. Add `"appliesFrom"` only when the rule has it, and sort with the key `(jurisdiction, ruleId, featureId)`.
---
`summarize` uses `summary.setdefault(jurisdiction, {"applies": 0, "upcoming": 0, "proposed": 0})` and increments by status. `check_freshness` floor-divides the difference of the two `parse_time_ms` values by one day.
