## Atomic Design

Brad Frost's **Atomic Design** (2013) describes interfaces as a hierarchy borrowed from chemistry:

| Level | What it is | Example |
| --- | --- | --- |
| **Atoms** | the smallest UI elements, useless to split further | `Button`, `Input`, `Label`, `Icon`, a color token |
| **Molecules** | small groups of atoms with one job | `SearchField` (label + input + button) |
| **Organisms** | complex sections made of molecules and atoms | `SiteHeader` (logo + navigation + search + cart) |
| **Templates** | page layouts with placeholder content: structure, not data | "product page layout" |
| **Pages** | templates filled with real content | the Keyboard product page |

Its strength is a **shared vocabulary** between designers and developers and a bottom-up way to build consistent interfaces: change an atom and every molecule using it changes too. Its weakness is the boundary questions: is a `ProductCard` a molecule or an organism? Teams spend real time debating classification that changes nothing for users.

## Where it fits: the design system

Atomic Design is a model for a **design system**: a product-agnostic library of tokens, components and guidelines (Shopify Polaris, IBM Carbon, Atlassian Design System, GitHub Primer). Inside a design system, levels make sense because components are generic: a `Button` has no idea about carts.

It fits **application structure** poorly. An app is organized by *domain* (catalog, cart, checkout), and a folder layout like `atoms/`, `molecules/`, `organisms/` is a by-type layout again: the `CartSummary` organism lives far from the cart hooks and API it depends on, and nothing stops an organism from importing any other.

The common, healthy combination:

```text
shared/ui/            design system (or an installed package): atoms and molecules
  Button.jsx  Input.jsx  SearchField.jsx  Modal.jsx
features/cart/ui/     domain organisms built from shared/ui
  CartSummary.jsx
pages/checkout/       templates + pages: composition and real data
```

The design system maps to the `shared` layer; domain organisms live in features or entities; pages are pages.

## Design tokens

**Design tokens** are the named design decisions under every component: colors, spacing, typography, radii, shadows, motion durations. They have levels too:

- **Primitive** (reference) tokens: raw values, `blue-600: #2563eb`, `space-4: 16px`.
- **Semantic** (system) tokens: intent, `color-action-primary: {blue-600}`, `color-text-danger`.
- **Component** tokens (optional): `button-primary-background: {color-action-primary}`.

Components consume semantic tokens, never raw values, so theming (dark mode, a rebrand, a white-label customer) is changing token values, not components. Tokens usually ship as CSS custom properties, generated from a single source (JSON in the W3C Design Tokens Community Group format, Style Dictionary, Figma variables). Tailwind 4's `@theme` is a token file too, which is how this platform defines its own colors.

## Component APIs

A design system lives or dies by its component APIs:

- **Small, consistent props**: `variant="primary" | "secondary"`, `size="sm" | "md"`, the same names on every component.
- **Composition over configuration**: `<Card><Card.Header/>...</Card>` or `children` instead of twenty boolean props (`hasIcon`, `isCompact`, `showFooter`).
- **Native behavior passes through**: spread remaining props onto the element, forward refs (in React 19 `ref` is a regular prop), keep `type`, `disabled`, `aria-*` working.
- **Accessibility built in**: focus states, roles, keyboard support. Headless libraries (Radix, React Aria, Base UI) provide behavior; the design system adds tokens and styling.
- **No domain knowledge**: `Button` never knows about carts. Once a component needs business data, it belongs to a feature.

## Pitfalls

- Folders named `atoms/molecules/organisms` for the whole app: Atomic Design used as app architecture.
- Debating classification instead of shipping components; the levels are a thinking tool.
- Hard-coded colors inside components, which make theming a rewrite.
- A "design system" that is a copy of components inside one app, without versioning, documentation or ownership.

## When to choose it

Use Atomic Design to build and document a design system or a `shared/ui` kit, and to talk about composition with designers. Organize the application itself by feature and layer. Invest in a real, separately versioned design system when several apps or teams must look and behave consistently; for a single app, a disciplined `shared/ui` with tokens is enough.
