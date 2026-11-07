`legacy` is `inject(LegacyUsers)`. Field initializers run in the injection context, so `toSignal(this.legacy.users$, { requireSync: true })` works there.
---
`filtered = computed(() => { const text = this.query().toLowerCase(); return this.users().filter((name) => name.toLowerCase().includes(text)); });`
---
In the constructor: `this.legacy.added$.pipe(takeUntilDestroyed()).subscribe((name) => this.added.push(name));`
