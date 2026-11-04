Map a product's AI features to obligations in every market it serves, from a dated rules table, so each obligation carries its source rule and its status on a given date.

The project has two files. `rules.ts` is seeded data you do not need to change: `RULES_AS_OF` (the date the table was reviewed) and `RULES`, a list of rules `{ id, jurisdiction, instrument, status, appliesFrom?, when, obligation }`. `status` is `'law'` or `'bill'`; `appliesFrom` is an ISO date; `when` is a condition `{ uses?, dataTypes?, users? }`, each a list of tags. You write `main.ts`.

A **product profile** is `{ name, markets, features }`; a **feature** is `{ id, uses, dataTypes, users }`. Markets and jurisdictions are codes such as `EU`, `BR`, `US`, `US-CA`, `UK`, `CN`.

## 1. `coversMarket(jurisdiction, markets)`

`true` when some market equals the jurisdiction or is one of its sub-markets (`US` covers `US-CA`: the market starts with the jurisdiction followed by `-`). `US-CA` does not cover `US`, and `AA` does not cover `AAX`.

## 2. `matchesFeature(when, feature)`

`true` when, for every key the condition sets (`uses`, `dataTypes`, `users`), the feature's list shares at least one value with it. Keys the condition does not set are ignored, so `{}` matches every feature.

## 3. `mapObligations(profile, rules, asOf)`

For every rule whose jurisdiction covers one of the profile's markets, and every feature it matches, return one obligation `{ ruleId, jurisdiction, instrument, featureId, obligation, status, appliesFrom? }` (`appliesFrom` only when the rule has one). `status` on the date `asOf`:

- `'proposed'` for a bill (a watch item, not an obligation yet);
- `'upcoming'` for a law whose `appliesFrom` is after `asOf`;
- `'applies'` otherwise (a law applies from its first day; a law without a date already applies).

Sort by `jurisdiction`, then `ruleId`, then `featureId`.

## 4. `summarize(obligations)`

Return `{ [jurisdiction]: { applies, upcoming, proposed } }` with counts, for the jurisdictions present.

## 5. `checkFreshness(rulesAsOf, asOf, maxAgeDays = 92)`

Return `{ fresh, ageDays }`: `ageDays` is the number of whole days from `rulesAsOf` to `asOf`, and the table is fresh while `ageDays <= maxAgeDays` (about a quarter).

The tests use their own small rules tables and also check a few results from the seeded table. The seeded table is a simplified teaching summary, not legal advice.
