1. Replace the empty `<h2>` content with an interpolation of `name()`.
2. Add `[src]` and `[alt]` property bindings to the `<img>`; build the alt text with string concatenation in the expression.
3. Add `[class.online]` to the `<article>`, keeping the static `class="card"` (Angular merges both).
4. Render the status with a ternary on `isOnline()` inside interpolation.
5. Bind `[attr.aria-valuenow]` on the progressbar, because ARIA attributes have no DOM property.
6. Bind `[style.width.%]` on `.bar` so the number gets the `%` unit.
