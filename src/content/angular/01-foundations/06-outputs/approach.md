1. In `StarRating`, declare `rated` (`output<number>()`) and `cleared` (`output<void>()`).
2. Implement `rate(star)` and `clear()` by calling `emit` on the matching output.
3. Below `hover$`, create `previewed` with `outputFromObservable`, piping `hover$` through `distinctUntilChanged()`.
4. In `App`, add the three event bindings on `<app-star-rating>`, using `$event` for the emitted values.
5. Hover and click the stars in the preview to check the summary and preview texts.
