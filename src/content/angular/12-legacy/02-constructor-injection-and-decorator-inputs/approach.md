1. Decorate `label`, `value` and `max` with `@Input()`, adding the `numberAttribute` transform to `value`.
2. Declare `rated` with `@Output()` and a typed `EventEmitter<number>`.
3. Add a constructor with a `private readonly analytics: RatingAnalytics` parameter property.
4. In `rate`, track first, then emit, so analytics never misses an event the parent handles.
5. Compare each line with its signal equivalent (`input`, `output`, `inject`) to recognize both styles.
