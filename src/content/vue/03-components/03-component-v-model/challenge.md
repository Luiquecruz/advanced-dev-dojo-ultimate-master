Build a `RatingInput.vue` that works with `v-model` and a named `v-model:comment`.

**`RatingInput.vue`**

1. Declare the default model with `defineModel<number>({ default: 0 })`.
2. Declare a named model `comment` (a string, default `""`).
3. Render five buttons with the text `★` and `aria-label="Rate 1"` … `aria-label="Rate 5"`. Clicking one sets the rating to its number. Each button has `aria-pressed="true"` when its number is less than or equal to the current rating, `"false"` otherwise.
4. Render a `<textarea aria-label="Comment">` bound to the `comment` model.

**`App.vue`**

5. Bind `rating` with `v-model` and `comment` with `v-model:comment`.
6. Render `<p class="summary">Rating: N</p>` and `<p class="comment">` with the comment text.
