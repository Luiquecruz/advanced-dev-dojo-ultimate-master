1. In `Card.vue`, add the three outlets: named `header` with fallback, default inside `.body`, and named `footer` guarded by `$slots.footer`.
2. In `ItemList.vue`, loop with `v-for="(item, index) in items"` and expose both values on a named `item` slot with the name as fallback.
3. In `App.vue`, fill the header and footer with `<template #header>` / `<template #footer>`.
4. Put `ItemList` directly in the card (default slot) and format each row through `<template #item="{ item, index }">`.
