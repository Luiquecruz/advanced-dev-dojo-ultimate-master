Keep private writable signals for the list and the category, and expose them with `asReadonly()`. `filtered` reads both inside `computed`.
---
`page = linkedSignal(() => { this.category(); return 1; });` reads the category only to depend on it.
---
`pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));` and `visible` slices `filtered()` from `(page - 1) * pageSize`.
