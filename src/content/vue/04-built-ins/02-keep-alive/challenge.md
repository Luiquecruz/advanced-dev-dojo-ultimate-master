Keep tab state alive in `App.vue`.

The tab components exist: `DraftTab.vue` has a textarea (`aria-label="Draft"`) and `StatsTab.vue` shows how many times it was activated.

**`StatsTab.vue`**

1. Use `onActivated` to increment an `activations` ref and render `<p class="activations">Activated N times</p>`.

**`App.vue`**

2. Render two buttons `Draft` and `Stats` that switch the current tab (starts at `Draft`).
3. Wrap `<component :is="...">` in `<KeepAlive>` so the draft text survives switching tabs.
