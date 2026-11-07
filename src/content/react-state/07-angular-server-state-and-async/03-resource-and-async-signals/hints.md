`params: () => { const id = this.id(); return id === null ? undefined : { id }; }` makes the null case idle.
---
`loader: ({ params, abortSignal }) => this.fetchProduct(params.id, abortSignal)`.
---
`title = computed(() => this.product.hasValue() ? this.product.value().name : 'Loading...')`.
