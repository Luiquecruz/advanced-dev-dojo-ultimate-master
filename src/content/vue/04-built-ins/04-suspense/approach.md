1. In `UserProfile.vue`, await the fetch at the top level, throw on a failed response and await the JSON.
2. Render the name and email directly: the component only renders after the data exists.
3. In `App.vue`, wrap `UserProfile` in `<Suspense>` with a `Loading…` fallback.
4. Register `onErrorCaptured` to store the error and return `false`, and render the alert conditionally.
