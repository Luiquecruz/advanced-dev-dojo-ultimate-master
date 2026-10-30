## React is a library, not an architecture

React describes itself as "the library for web and native user interfaces". It turns state into UI and keeps the DOM in sync. It does **not** decide:

- where the HTML is produced (browser, server, build step, CDN edge),
- how files and features are organized,
- where data comes from, how it is cached and who owns each piece of state,
- how ten teams ship the same product without blocking each other.

Frameworks such as Next.js, React Router (framework mode) or TanStack Start answer some of these questions for you. Plain React leaves all of them open. **Frontend architecture is the set of answers**, whether you wrote them down or not.

## The four decision layers

Every React application, from a landing page to a banking portal, has made a decision in each of these layers:

| Layer | Question | Typical answers |
| --- | --- | --- |
| 1. Rendering | Where and when does the HTML get produced? | static files, MVC templates, SPA, SSR, SSG, ISR, islands, Server Components |
| 2. Code organization | How is the code split and what may import what? | by type, by feature, layered (Feature-Sliced Design), hexagonal |
| 3. State and data | Who owns each piece of state and how does data travel? | local state, URL, server cache (TanStack Query), client store, BFF view models |
| 4. Scale | How do teams and deploys grow? | monolith, modular monolith, monorepo, micro-frontends |

The layers are **independent**. A SPA can be organized by feature or by type; an SSR app can be a modular monolith or a set of micro-frontends; a static site can still use TanStack Query for a search widget. Mixing them up leads to bad arguments such as "we need micro-frontends because our SSR is slow": slowness is a layer 1 problem, micro-frontends answer a layer 4 problem.

```
Admin dashboard
  1. Rendering      SPA (behind login, no SEO)
  2. Organization   features/ with a public index per feature
  3. State          TanStack Query for server data, URL for filters, useState for UI
  4. Scale          one repo, one deploy, two teams with CODEOWNERS
```

## Architecture vs component design vs folder structure

These three are often confused:

- **Component design** is about one component or a small family: props, composition, controlled vs uncontrolled, where a `useState` lives. Its blast radius is a screen.
- **Folder structure** is how files are laid out on disk. It is a *consequence* of a code organization decision, not the decision itself: renaming `components/` to `features/` changes nothing if every file still imports everything.
- **Architecture** is the set of decisions that are **expensive to change later** and that affect the whole system: rendering model, dependency rules, data ownership, deploy units. A useful test: if reversing the choice needs a migration plan, it is architecture.

## Implicit decisions

Running `npm create vite@latest` makes several architectural decisions in one second: client-side rendering, a single bundle, one deploy unit, and (by default) no dependency rules at all. That is often the right call, but it is still a decision. Problems appear when nobody notices it was made:

- a marketing page built as a SPA that search engines index poorly,
- a "temporary" global store that ends up holding server data, form drafts and modal flags,
- a `utils/` folder imported by every feature, turning into the place where coupling hides.

Making decisions **explicit** means naming the layer, the options considered and the reason for the choice. Later lessons record them as Architecture Decision Records.

## Pitfalls

- Treating the framework as the architecture ("we use Next.js" answers layer 1 partially, and says nothing about layers 2–4).
- Copying a famous company's architecture without its team size or traffic.
- Deciding all four layers once for the whole product: rendering is usually decided **per route**, organization per module.

## When to choose it

Think in the four layers at the start of a project, before a big feature, and whenever a problem keeps coming back. For each layer, ask what the product needs today (SEO? offline? many teams?) and pick the simplest option that satisfies it. Leave the rest implicit on purpose, and revisit when a quality attribute starts to hurt.
