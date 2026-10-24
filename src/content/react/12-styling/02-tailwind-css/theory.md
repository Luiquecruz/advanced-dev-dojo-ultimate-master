## Utility-first CSS

Tailwind CSS gives you thousands of small, single-purpose classes and lets you compose design directly in markup:

```jsx
<button className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 focus-visible:outline-2">
  Save
</button>
```

A build step scans your source files for class names and generates CSS only for the ones it finds. You never write a selector, never invent a class name and never wonder which stylesheet still uses `.card-header-v2`.

## Tailwind v4: CSS-first configuration

**Legacy (v3):** a `tailwind.config.js` file with a `content` array of globs, a `theme.extend` object in JavaScript, and three directives:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Modern (v4):** one import and configuration written in CSS. Source files are detected automatically (respecting `.gitignore`), and the engine is a lot faster.

```css
@import "tailwindcss";

@theme {
  --color-brand-500: oklch(0.65 0.17 230);
  --font-display: "Inter", sans-serif;
  --breakpoint-3xl: 120rem;
}
```

Every variable inside `@theme` is a **design token**. Its namespace decides which utilities appear: `--color-brand-500` creates `bg-brand-500`, `text-brand-500`, `border-brand-500`; `--font-display` creates `font-display`; `--breakpoint-3xl` creates the `3xl:` variant. Tokens are also emitted as real CSS variables on `:root`, so `var(--color-brand-500)` works in custom CSS or inline styles. Reset a whole namespace with `--color-*: initial;` to ship only your own palette.

With Vite, install `tailwindcss` and `@tailwindcss/vite` and add the plugin. Other directives you will meet in v4: `@source` (add paths the scanner should read), `@utility` (define a custom utility), `@custom-variant` (for example a class-based `dark` variant) and `@plugin`.

## Variants

Prefixes apply a utility conditionally:

| Variant | Meaning |
| --- | --- |
| `hover:` `focus-visible:` `disabled:` | element state |
| `sm:` `md:` `lg:` | **min-width** breakpoints (mobile first) |
| `dark:` | dark color scheme |
| `aria-selected:` `data-[state=open]:` | ARIA and data attributes |
| `group-hover:` `peer-checked:` | state of a parent or sibling |

`p-4 md:p-6` means "padding 1rem, and 1.5rem from the `md` breakpoint up". Never think of `md:` as "on medium screens only".

## The number one pitfall: dynamic class names

The scanner reads your files as **plain text**. It never runs your code. This does not work:

```jsx
<span className={`bg-${color}-100 text-${color}-800`} />
```

The strings `bg-green-100` and `text-green-800` never appear in the source, so their CSS is never generated. Map props to **complete class strings** instead:

```jsx
const tones = {
  success: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
};

<span className={tones[status]} />
```

## Conflicts and `tailwind-merge`

`clsx('p-4', 'p-2')` produces `"p-4 p-2"`, and the winner depends on the order of rules in the generated stylesheet, not in your string. `tailwind-merge` resolves conflicts so the last one wins. shadcn/ui wraps both in a `cn()` helper:

```js
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

## Pros and cons

- Fast iteration, consistent spacing and colors from tokens, tiny CSS output, no naming.
- Long class strings: extract **components**, not `@apply` classes, when markup repeats.
- Ideal for Server Components because the output is static CSS.

> In the Dojo sandbox Tailwind is not loaded, so the preview shows unstyled markup. The tests check the class names, exactly like the scanner would.
