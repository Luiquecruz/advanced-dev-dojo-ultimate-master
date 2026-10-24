This project has three files. Build two reusable containers and compose them in `App.jsx`.

**`Card.jsx`**: `export function Card({ title, children })` renders:

```html
<section class="card">
  <h2>{title}</h2>
  <div class="card-body">{children}</div>
</section>
```

**`Layout.jsx`**: `export function Layout({ sidebar, children })` renders a `<div className="layout">` that contains an `<aside>` with the `sidebar` content and a `<main>` with the `children`.

**`App.jsx`** (default export `App`) renders a `Layout`:

- `sidebar`: a `<nav>` element containing the text `Menu`.
- children: a `Card` titled `Welcome` with the paragraph `<p>Glad to see you here.</p>` inside.
