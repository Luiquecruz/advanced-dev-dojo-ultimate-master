1. Add the `user` record to `routes` with the path `/users/:id(\\d+)` and `props: true`.
2. In `UserView.vue`, replace the hard-coded logic with `const props = defineProps<{ id: string }>()`.
3. Move the fetch into a watcher on `() => props.id` with `immediate: true`, resetting `user` before each request so the loading state shows.
4. Interpolate `props.id` in the URL: `` `/api/users/${id}` ``, and keep the existing template for rendering.
