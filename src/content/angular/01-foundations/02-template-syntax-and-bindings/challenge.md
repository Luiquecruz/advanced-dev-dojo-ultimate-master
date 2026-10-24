Complete the `ProfileCard` component in `app.ts` (selector `app-profile-card`). The signals `name`, `avatarUrl`, `isOnline` and `progress` already exist. Bind them in the template:

1. Render `name()` inside the `<h2>` with interpolation.
2. Bind the `<img>` `src` **property** to `avatarUrl()` and its `alt` to `` `${name()} avatar` `` (for example `Ada Lovelace avatar`).
3. Add the CSS class `online` to the `<article>` only while `isOnline()` is `true` (use a class binding).
4. Inside the `<span class="status">` render the text `Online` or `Offline` depending on `isOnline()`.
5. On the `<div role="progressbar">`, bind the attribute `aria-valuenow` to `progress()`.
6. On the inner `<div class="bar">`, bind the style `width` in percent to `progress()` (for `40` it must be `width: 40%`).

Bindings must react when the signals change.
