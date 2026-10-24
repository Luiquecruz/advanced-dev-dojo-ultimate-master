Complete the types for an event pipeline, then implement two helpers.

1. `type EventType` — the union of every `type` value of `AppEvent`.
2. `type ClickEvent` — the `click` member of `AppEvent` (use `Extract`).
3. `type KeyboardOrFocusEvent` — the `keypress` and `focus` members (use `Extract`).
4. `type NonClickEvent` — every member except `click` (use `Exclude`).
5. `compact<T>(items: readonly T[]): NonNullable<T>[]` — removes `null` and `undefined` (keeps `0`, `''` and
   `false`).
6. `clicksOnly(events: readonly AppEvent[]): ClickEvent[]` — keeps only click events, typed precisely.
