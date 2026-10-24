Build a reusable `UserCard.vue` and render a list of them in `App.vue`.

**`UserCard.vue`**

1. Declare props with the type-based `defineProps`: `name: string` (required), `role?: string` and `online?: boolean`.
2. Use reactive props destructure for defaults: `role` defaults to `"Member"`, `online` to `false`.
3. Render a root `<article class="user-card">` containing:
   - `<h3>` with the name,
   - `<p class="role">` with the role,
   - `<span class="status">` with the text `Online` or `Offline`.

**`App.vue`**

4. Loop over the provided `users` array and render one `UserCard` per user with `:key="user.id"`, passing `name`, `role` and `online`. Grace Hopper has no role, so she shows the default.
