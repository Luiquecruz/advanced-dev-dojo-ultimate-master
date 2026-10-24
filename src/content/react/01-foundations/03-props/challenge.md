Build a small team page driven entirely by props.

1. `export function Avatar({ name, imageUrl, size })` renders an `<img>` with `src={imageUrl}`, `alt={name}`, and `width` and `height` equal to `size`. When `size` is not passed it defaults to **`64`**.
2. `export function Profile({ name, role, imageUrl })` renders an `<article>` containing:
   - an `<Avatar>` for that person with `size` **`96`**,
   - an `<h3>` with the `name`,
   - a `<p>` with the `role`.
3. The default export `TeamPage` renders a `<section>` with **two** profiles:
   - `Ada Lovelace`, role `Mathematician`, image `/avatars/ada.png`
   - `Grace Hopper`, role `Computer Scientist`, image `/avatars/grace.png`

Use destructuring with a default value, not `defaultProps` (removed for function components in React 19).
