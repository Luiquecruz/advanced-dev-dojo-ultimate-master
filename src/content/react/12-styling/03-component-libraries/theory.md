## Why use a component library?

A date picker, a combobox or a modal dialog looks simple until you implement focus trapping, keyboard navigation, screen reader announcements, collision-aware positioning, scroll locking and right-to-left support. Component libraries package years of that work. The real choice is **how much of the look you want them to own**.

## Three families

### 1. Styled kits (batteries included)

Material UI (MUI), Ant Design, Mantine and Chakra UI ship complete, themed components:

```jsx
import Button from '@mui/material/Button';

<Button variant="contained" color="primary">Save</Button>
```

- Fastest path to a consistent, complete UI (data grids, date pickers, forms).
- You customize through a **theme object** and component props. Deep visual changes fight the library.
- Bundle size and the styling engine matter: libraries built on runtime CSS-in-JS need extra care with Server Components and streaming. Recent versions moved toward CSS variables and zero-runtime engines (Chakra UI v3 rebuilt on Ark UI and Panda-style recipes; MUI added CSS variables and Pigment CSS).

### 2. Headless primitives (behavior only)

Radix Primitives, Base UI (from the creators of Radix, MUI and Floating UI), React Aria Components (Adobe), Headless UI (Tailwind Labs) and Ark UI give you **unstyled, accessible behavior**. You bring every class.

```jsx
import { Dialog } from '@base-ui/react/dialog';

<Dialog.Root>
  <Dialog.Trigger className="btn">Open</Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Backdrop className="fixed inset-0 bg-black/40" />
    <Dialog.Popup className="rounded-xl bg-white p-6">
      <Dialog.Title>Delete project?</Dialog.Title>
      <Dialog.Close>Cancel</Dialog.Close>
    </Dialog.Popup>
  </Dialog.Portal>
</Dialog.Root>
```

They are built as **compound components** and expose state through `data-*` attributes (`data-open`, `data-state="open"`) that you style with CSS or Tailwind variants. To render a primitive as your own element, Radix uses `asChild` while Base UI uses a `render` prop.

### 3. Open code: shadcn/ui

shadcn/ui is not a dependency you install from npm. A CLI **copies component source into your repo** (`components/ui/button.tsx`), built from headless primitives plus Tailwind classes and the `cn()` helper:

```bash
npx shadcn@latest init
npx shadcn@latest add dialog
```

You own the code: change anything, no waiting for a library release, no fighting overrides. The cost: you also own upgrades and bug fixes. Since July 2026 new shadcn/ui projects use **Base UI** primitives by default; Radix stays fully supported (`shadcn init -b radix`). Registries let teams distribute their own components with the same CLI.

## How to choose

| Situation | Reasonable pick |
| --- | --- |
| Internal tool or admin, speed over brand | Styled kit (MUI, Mantine, Ant Design) |
| Custom brand and a design system | Headless primitives + your styles, or shadcn/ui |
| Strict accessibility and i18n requirements | React Aria Components, Base UI, Radix |
| Tailwind codebase | shadcn/ui, Headless UI, Base UI |

## Pitfalls

- **Rebuilding primitives yourself.** A `<div onClick>` dropdown fails keyboard and screen reader users. Use a primitive or native elements (`<dialog>`, `<details>`, `<select>`).
- **Mixing several styled kits.** Two theme systems, two sets of focus rings, double the bundle.
- **Overriding internals** with deep selectors (`.MuiButton-root > span`) breaks on upgrades. Use the theme or slot props.
- **Client boundaries.** Interactive library components are Client Components; in the App Router wrap or import them from files marked `'use client'` (most libraries already include the directive).
- Unmaintained choices: check activity before adopting. Libraries move fast; for example, shadcn/ui changed its default primitive layer twice in its first years.
