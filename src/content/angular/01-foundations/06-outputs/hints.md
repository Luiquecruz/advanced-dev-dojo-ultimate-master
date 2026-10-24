Declare outputs as fields: `readonly rated = output<number>();` and `readonly cleared = output<void>();`. Emit with `this.rated.emit(star)`.
---
`readonly previewed = outputFromObservable(this.hover$.pipe(distinctUntilChanged()));` — declare it **after** `hover$`, because field initializers run in order.
---
In the parent template: `(rated)="rating.set($event)"`, `(cleared)="rating.set(0)"`, `(previewed)="preview.set($event)"`.
