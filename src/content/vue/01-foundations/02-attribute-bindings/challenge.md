Finish the profile card in `App.vue`. The state is already declared in `<script setup>`; your job is to bind it to the template.

1. The `<img>` must bind `src` to `avatarUrl` and `alt` to `name` (so it renders `alt="Ada Lovelace"`).
2. The `<section>` must get its `id` from the `id` constant using the **same-name shorthand** (`:id`, no value).
3. The `Save` `<button>` must be disabled while `isBusy` is `true`. The existing `Finish` button sets `isBusy` to `false`, which must enable `Save`.
4. The `<a>` must receive every attribute of the `link` object with `v-bind="link"` (it renders `href="https://vuejs.org"` and `target="_blank"`).
