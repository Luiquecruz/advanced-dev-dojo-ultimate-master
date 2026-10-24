1. In `App.vue`, wrap `<component :is>` in `<KeepAlive>`.
2. In `StatsTab.vue`, register `onActivated` and increment the counter.
3. Switch tabs back and forth in the preview: the draft persists and the counter increases.
