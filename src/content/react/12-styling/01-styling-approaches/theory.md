## Many ways to put CSS on a component

React does not ship a styling system. A component outputs DOM elements, and anything that can style DOM works. What changes between approaches is **scoping** (can two components clash?), **runtime cost** and **how dynamic values reach the CSS**.

## 1. Inline styles

`style` takes an **object**, not a string. Properties are camelCase and numbers become pixels for most length properties.

```jsx
<div style={{ backgroundColor: 'teal', padding: 16, width: `${percent}%` }} />
```

Inline styles are perfect for values only known at runtime (a progress width, a drag position, a color picked by the user). They cannot express `:hover`, media queries or animations, and they win over every class, which makes overrides painful. Custom properties work too, which is the bridge between React state and a stylesheet:

```jsx
<div className="meter" style={{ '--level': value }} />
```

```css
.meter { width: calc(var(--level) * 1%); }
```

## 2. Global CSS with `className`

`class` is a reserved word in JavaScript, so React uses `className`. Plain stylesheets are fast and familiar, but every class lives in **one global namespace**: a `.title` in one file restyles every `.title` in the app. Teams fought this with naming conventions such as BEM (`card__title--active`).

## 3. CSS Modules

A file named `Button.module.css` is compiled so that each class gets a unique name. Importing it returns a map from the name you wrote to the generated one.

```jsx
import styles from './Button.module.css';

export function Button() {
  return <button className={styles.primary}>Save</button>;
}
```

The rendered class becomes something like `Button_primary__x1y2z`. Vite, Next.js and most bundlers support CSS Modules with zero config. You keep real CSS (pseudo-classes, media queries, container queries) with local scope by default.

## 4. CSS-in-JS

Libraries such as styled-components and Emotion let you write CSS inside JavaScript and interpolate props:

```jsx
const Title = styled.h1`
  color: ${(props) => (props.$muted ? 'gray' : 'black')};
`;
```

**Legacy vs modern.** Runtime CSS-in-JS generates and injects styles while rendering. That costs CPU on every render, complicates streaming SSR and does not work inside Server Components. styled-components entered maintenance mode in 2025. New projects favor **zero-runtime** tools that extract static CSS at build time (vanilla-extract, Panda CSS, StyleX, Linaria) or utility classes.

## 5. Utility classes

Utility-first frameworks such as Tailwind CSS give you small single-purpose classes (`flex`, `p-4`, `text-sm`) and generate only the ones you use. The next lesson covers Tailwind in depth.

## Conditional classes with `clsx`

Joining class names with template strings gets messy fast (`undefined` and double spaces leak into the DOM). `clsx` accepts strings, objects and arrays and keeps only truthy entries:

```jsx
import clsx from 'clsx';

const className = clsx(
  'btn',
  `btn-${variant}`,
  { 'btn-block': fullWidth, 'btn-loading': loading },
  props.className,
);
```

Put the caller's `className` **last** so consumers can extend a component. With Tailwind, combine `clsx` with `tailwind-merge` (`cn()` in shadcn/ui) so a later `p-2` actually replaces an earlier `p-4`.

## Pitfalls

- `style="color: red"` throws: always pass an object.
- `style={{ width: 50 }}` means `50px`, but unitless properties like `opacity`, `zIndex`, `flexGrow` and `lineHeight` stay numbers.
- Forgetting to forward `className` and the rest of the props makes a component impossible to extend.
- Inline styles for everything: no hover, no media queries, no reuse. Use classes for static design, inline styles or custom properties for truly dynamic values.

## Choosing

| Need | Good fit |
| --- | --- |
| Value computed at runtime | inline style or CSS custom property |
| Scoped CSS without new syntax | CSS Modules |
| Design system with tokens | Tailwind, Panda CSS, vanilla-extract |
| Server Components | anything that outputs static CSS (avoid runtime CSS-in-JS) |
