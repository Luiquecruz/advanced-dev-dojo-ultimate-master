Declare `private readonly store = inject(TodosStore);` and `private readonly api = inject(TODO_API);` so the facade is the only way in.
---
`vm = computed(() => ({ status: this.store.status(), items: this.store.items(), remaining: this.store.items().filter((todo) => !todo.completed).length }))`.
---
`load()` uses `try { const items = await this.api.list(); this.store.setItems(items); this.store.setStatus('ready'); } catch { this.store.setStatus('error'); }` after setting `loading`.
