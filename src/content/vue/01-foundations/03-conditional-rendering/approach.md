1. Replace the single placeholder paragraph with four adjacent `<p>` elements, one per status.
2. Put `v-if` on the loading one, `v-else-if` on the error and success ones, and `v-else` on the fallback.
3. Add `role="alert"` to the error paragraph.
4. Add the `<aside>` with `v-show="showHelp"` so it is rendered once and only its visibility changes.
