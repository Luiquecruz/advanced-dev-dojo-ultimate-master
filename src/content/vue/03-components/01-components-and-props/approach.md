1. In `UserCard.vue`, call `defineProps` with a type literal listing `name`, `role?` and `online?`.
2. Destructure the result, giving `role` and `online` default values.
3. Render the article, interpolating `name` and `role`, and use a ternary on `online` for the status text.
4. In `App.vue`, render `<UserCard>` inside a `v-for` with a key and bind the three props.
