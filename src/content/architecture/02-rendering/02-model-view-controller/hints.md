Start with the model: `findProductById` awaits `findProducts('')` and uses `products.find(...)`. Remember the id from the URL is a string, so compare with `Number(id)`, and return `null` (not `undefined`) when nothing matches.
---
In the list view, branch on `products.length === 0`. Use `defaultValue={query}` on the input: `renderToStaticMarkup` turns it into a `value` attribute. Write the price as `{' '}${product.price}` or ` ${product.price}` after the link so the item text is `Keyboard $120`.
---
In the controller, normalize the path with `pathname.replace(/\/+$/, '')`, then match the detail route with `path.match(/^\/products\/(\d+)$/)`. Call the model with `match[1]`, and return `notFound()` when it gives back `null`.
