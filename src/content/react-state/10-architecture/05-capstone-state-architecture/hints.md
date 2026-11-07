Work layer by layer. Start with the store and the key factory: they can be checked in isolation. `search: (q) => [...productKeys.all, q]`, and `add` returns `{ items: [...state.items, { id, name, price, quantity: 1 }] }` or maps to a new line with `quantity + 1`.
---
In `Catalog`, replace the hard-coded values: `const q = searchParams.get('q') ?? '';` and `const category = searchParams.get('category') ?? 'all';`. The local `useState` for the category must go: the URL is now its only source of truth.
---
Write with the functional form so other params survive: `setSearchParams((params) => { if (value === emptyValue) params.delete(name); else params.set(name, value); return params; })`. Call it from `onSearch` (`'q'`, empty value `''`) and from the category buttons (`'category'`, empty value `'all'`).
