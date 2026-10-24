Provide an object, not a bare value: `provide(ThemeKey, { theme: readonly(theme), toggle })`. The ref keeps it reactive and `readonly` prevents descendants from writing to it.
---
`inject(ThemeKey, { theme: ref('light'), toggle: () => {} })` returns the default when no ancestor provides the key.
---
Destructuring the injected object is safe: `theme` is still a ref, so `:class="['panel', theme]"` and `{{ theme === 'light' ? 'dark' : 'light' }}` stay reactive.
