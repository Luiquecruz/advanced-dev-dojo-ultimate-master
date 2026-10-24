`const rating = defineModel<number>({ default: 0 })` returns a ref. Assigning to it in the template (`rating = star`) emits `update:modelValue`.
---
A named model takes the name first: `defineModel<string>('comment', { default: '' })`. Bind the textarea to it with plain `v-model="comment"`.
---
Render the stars with `v-for="star in 5"` (starts at 1) and bind `:aria-pressed="star <= rating"`. In the parent: `<RatingInput v-model="rating" v-model:comment="comment" />`.
