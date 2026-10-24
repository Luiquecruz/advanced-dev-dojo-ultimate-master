1. Call `watch` with `userId` as the source and an async callback receiving `(newId, oldId)`.
2. In the callback, record the change when `oldId` exists, then fetch `/api/users/${newId}` and assign the parsed JSON to `user.value`.
3. Pass `{ immediate: true }` so the first user loads without any click.
4. Add a `watchEffect` that assigns `document.title` from `userId.value`.
