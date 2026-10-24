Nested JSX arrives in the `children` prop. Add it to the destructuring and render it: `<div className="card-body">{children}</div>`.
---
`sidebar` is just another prop that happens to hold JSX. In `Layout`, render `{sidebar}` inside `<aside>` and `{children}` inside `<main>`.
---
In `App`, pass the element directly: `<Layout sidebar={<nav>Menu</nav>}>`, then nest `<Card title="Welcome"><p>Glad to see you here.</p></Card>` between the Layout tags.
