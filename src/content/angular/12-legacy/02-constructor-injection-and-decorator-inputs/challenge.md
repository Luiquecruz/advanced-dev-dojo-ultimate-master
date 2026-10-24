Finish the legacy-style `RatingComponent` (selector `app-rating`) in `app.ts`. The template is already written. **Use the decorator APIs, not `input()`/`output()`/`inject()`.**

1. `@Input() label = ''`.
2. `@Input({ transform: numberAttribute }) value = 0` so `value="4"` becomes the number `4`.
3. `@Input() max = 5`.
4. `@Output() rated = new EventEmitter<number>()`.
5. Inject `RatingAnalytics` through the constructor: `constructor(private readonly analytics: RatingAnalytics) {}`.
6. `rate(value)` calls `this.analytics.track(this.label, value)` and then emits `value` through `rated`.

A parent using `<app-rating label="Docs" [value]="score" (rated)="score = $event" />` shows `Docs: 4/5` after the `Rate 4` button is clicked.
