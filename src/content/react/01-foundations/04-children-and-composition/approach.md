1. In `Card.jsx`, destructure `children` next to `title` and render it inside the `.card-body` div.
2. In `Layout.jsx`, destructure `{ sidebar, children }` and render `<aside>{sidebar}</aside>` and `<main>{children}</main>` inside the `.layout` div.
3. In `App.jsx`, pass `sidebar={<nav>Menu</nav>}` as a prop (an element, not a component reference).
4. Nest the `Card` with its paragraph between the `Layout` tags so it becomes `Layout`'s `children`.
