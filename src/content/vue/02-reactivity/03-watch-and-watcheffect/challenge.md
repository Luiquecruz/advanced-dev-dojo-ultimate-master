Load users as `userId` changes in `App.vue`. The `userId` ref, the `Previous` / `Next` buttons, the `user` ref and the template are provided.

1. Use **`watch`** on `userId` with **`immediate: true`**: fetch `/api/users/<id>` and store the JSON in `user`. The template renders the name in an `<h2>` (`Ada Lovelace` for id `1`).
2. In the same watch callback, when there is an old id, push the text `` `${oldId} → ${newId}` `` into the `changes` array (rendered as `<li>`s). The immediate first run must not add an entry.
3. Use **`watchEffect`** to keep `document.title` equal to `` `User ${userId}` ``.
