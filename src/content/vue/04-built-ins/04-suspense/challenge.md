Load a user with async setup and a Suspense boundary.

**`UserProfile.vue`**

1. Prop: `userId: number`.
2. With top-level `await`, fetch `/api/users/{userId}`. If the response is not ok, throw an `Error`. Otherwise read the JSON.
3. Render `<h2>` with the user name and `<p class="email">` with the email.

**`App.vue`**

4. Render `UserProfile` with `:user-id="1"` inside `<Suspense>` with a `#fallback` slot showing `<p>Loading…</p>`.
5. Capture errors with `onErrorCaptured`: store a message, return `false`, and render `<p role="alert">Could not load user</p>` instead of the boundary.
