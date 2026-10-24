Build a star rating made of two files.

**`rating.ts` — `StarRating`** (selector `app-star-rating`, already renders one button per star with `aria-label="Rate N"`, plus a **Clear** button). Add:

1. An output `rated` of type `number`, emitted with the star number (1–5) when a star button is clicked (implement `rate(star)`).
2. An output `cleared` of type `void`, emitted when **Clear** is clicked (implement `clear()`).
3. An output `previewed` created with `outputFromObservable` from the existing `hover$` subject, piped through `distinctUntilChanged()` so hovering the same star twice in a row emits only once.

**`app.ts` — `App`** (parent):

4. Listen to `(rated)` and store `$event` in the `rating` signal.
5. Listen to `(cleared)` and reset `rating` to `0`.
6. Listen to `(previewed)` and store `$event` in the `preview` signal.

The summary texts (`You rated 4/5`, `Not rated yet`, `Preview: 3`) are already in the parent template.
