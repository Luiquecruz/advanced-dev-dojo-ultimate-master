## Components are functions

A React component is a JavaScript function that returns markup. Components let you split the UI into independent, reusable pieces and think about each piece in isolation.

```jsx
function Avatar() {
  return <img className="avatar" src="/avatars/ada.png" alt="Ada Lovelace" />;
}

export default function Profile() {
  return (
    <article>
      <Avatar />
      <h3>Ada Lovelace</h3>
    </article>
  );
}
```

`<Avatar />` is not HTML. When React sees it, it calls `Avatar()` and puts the returned elements in its place. You can use a component as many times as you like.

## Names must start with a capital letter

JSX uses the first letter to decide what a tag is:

| Tag | Meaning |
| --- | --- |
| `<section>` | a built-in HTML element (string `'section'`) |
| `<Section>` | a component (the variable `Section`) |

If you name a component `avatar` and write `<avatar />`, React creates an unknown `<avatar>` HTML element and your function is never called. No error, just nothing useful on screen.

## Define components at the top level

Never declare a component inside another component:

```jsx
export default function Gallery() {
  // 🔴 A brand new Profile type is created on every render of Gallery
  function Profile() {
    return <article>...</article>;
  }
  return <Profile />;
}
```

Each render of `Gallery` creates a *new* `Profile` function. React sees a different component type every time, so it throws away the old DOM and **resets all state** inside it. It is also slower. Declare every component at the top level of the module and pass data through props instead.

## Exporting and importing

Components usually live in their own files. A file can have **one default export** and any number of **named exports**:

```jsx
// Profile.jsx
export function Avatar() { /* ... */ }        // named export
export default function Profile() { /* ... */ } // default export
```

```jsx
// App.jsx
import Profile, { Avatar } from './Profile';
```

| Syntax | Export | Import |
| --- | --- | --- |
| Default | `export default function Button() {}` | `import Button from './Button'` |
| Named | `export function Button() {}` | `import { Button } from './Button'` |

Many teams prefer named exports everywhere because the name is enforced at the import site; frameworks like Next.js require a default export for pages.

## What a component can return

- JSX (one root element or a Fragment `<>...</>`)
- `null` to render nothing
- strings, numbers and arrays of elements

## Legacy note: class components

Before hooks (2019) stateful components were classes:

```jsx
class Profile extends React.Component {
  render() {
    return <h3>Ada Lovelace</h3>;
  }
}
```

Function components are the modern default. You will still meet classes in older codebases; the legacy module covers them.

## Pitfalls

- Lowercase component names silently render unknown HTML tags.
- Nested component definitions reset state on every render.
- Forgetting `return` (or writing `return` on its own line before the JSX) makes the component render nothing. Wrap multi-line JSX in parentheses: `return ( ... );`.
