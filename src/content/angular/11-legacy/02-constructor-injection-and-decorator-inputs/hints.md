Put the decorator right before each field: `@Input() label = '';`. Options go inside the parentheses: `@Input({ transform: numberAttribute }) value = 0;`.
---
Outputs are emitters: `@Output() rated = new EventEmitter<number>();` and later `this.rated.emit(value);`.
---
A parameter property both declares and assigns the dependency: `constructor(private readonly analytics: RatingAnalytics) {}`. Then `this.analytics.track(this.label, value)` in `rate`.
