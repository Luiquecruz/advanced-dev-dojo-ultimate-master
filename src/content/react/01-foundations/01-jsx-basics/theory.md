## What is JSX?

JSX is a syntax extension that lets you write markup inside JavaScript. It is **not** HTML: a compiler (Babel, SWC, esbuild, TypeScript) turns every tag into a function call.

```jsx
const element = <h1 className="title">Hello</h1>;
```

compiles (with the modern *automatic runtime*, React 17+) to:

```js
import { jsx as _jsx } from 'react/jsx-runtime';
const element = _jsx('h1', { className: 'title', children: 'Hello' });
```

Before React 17 the *classic runtime* produced `React.createElement('h1', { className: 'title' }, 'Hello')`, which is why old files always started with `import React from 'react'`.

## Rules of JSX

1. **Return a single root.** Wrap siblings in a parent element or a Fragment `<>...</>`.
2. **Close every tag.** `<img />`, `<br />`, `<input />`.
3. **camelCase attributes.** `className` instead of `class`, `htmlFor` instead of `for`, `onClick`, `tabIndex`.
4. **Curly braces embed JavaScript expressions**: `{user.name}`, `{1 + 1}`, `{format(date)}`. Statements (`if`, `for`) are not allowed inside braces.
5. **`style` takes an object**: `style={{ color: 'red', fontSize: 14 }}`.

## Expressions everywhere

```jsx
const user = { name: 'Ada', avatar: '/ada.png' };

export default function Profile() {
  return (
    <figure>
      <img src={user.avatar} alt={`Avatar of ${user.name}`} />
      <figcaption>{user.name.toUpperCase()}</figcaption>
    </figure>
  );
}
```

`null`, `undefined`, `true` and `false` render nothing; numbers and strings render as text; arrays render each item.
