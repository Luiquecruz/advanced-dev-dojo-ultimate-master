Connect the signup form in `App.vue` to its state with `v-model`. The fields and a live summary are already in the starter; the summary prints each ref with `JSON.stringify`, so types matter.

1. **Name** text input → `name`, with `.trim` (typing `  Ada  ` shows `"Ada"`).
2. **Age** number input → `age`, with `.number` (typing `36` shows `36`, not `"36"`).
3. **Free** / **Pro** radios → `plan` (starts at `"free"`, so Free is checked initially).
4. **Newsletter** checkbox → the boolean `newsletter`.
5. **Vue** and **TypeScript** checkboxes → the array `topics` (values `"vue"` and `"ts"`).
6. **Country** select → `country`.
