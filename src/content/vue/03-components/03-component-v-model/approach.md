1. Declare the default model (number) and the `comment` model (string) with `defineModel`.
2. Render five buttons with `v-for="star in 5"`, a dynamic `aria-label` and `aria-pressed`.
3. Set the model ref on click; Vue emits the update event for you.
4. Bind the textarea with `v-model` to the `comment` model ref.
5. In `App.vue`, add `v-model` and `v-model:comment` to `RatingInput`.
