JSX looks at the first letter of a tag: `<avatar />` becomes an unknown HTML element, `<Avatar />` calls your function.
---
Cut the whole `function Profile() { ... }` block out of `TeamPage` and paste it above `TeamPage`, at the top level of the file.
---
Add `export` in front of both helper functions: `export function Avatar() { ... }` and `export function Profile() { ... }`. Keep `export default` on `TeamPage`, and update `<avatar />` to `<Avatar />`.
