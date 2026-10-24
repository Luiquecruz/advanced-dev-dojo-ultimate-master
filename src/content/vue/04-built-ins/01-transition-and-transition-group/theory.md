## Animating enter and leave

When `v-if` removes an element, it disappears instantly. `<Transition>` wraps **one** element or component and applies CSS classes at the right moments so you can animate it in and out:

```vue
<button @click="open = !open">Toggle</button>
<Transition name="fade">
  <p v-if="open">Hello</p>
</Transition>
```

```css
.fade-enter-active,
.fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
```

## The six classes

For `name="fade"`, Vue adds and removes:

| Phase | Classes |
| --- | --- |
| Enter | `fade-enter-from` (first frame) → `fade-enter-active` (whole duration) → `fade-enter-to` (after first frame) |
| Leave | `fade-leave-from` → `fade-leave-active` → `fade-leave-to` |

Usually you only style `*-enter-active` / `*-leave-active` (the `transition` property) and `*-enter-from` / `*-leave-to` (the hidden state). Vue detects when the CSS transition or animation ends (`transitionend`/`animationend`) and then removes the element.

Without a `name`, the prefix is `v-` (`v-enter-from`). In Vue 2 the first class was called `v-enter`; Vue 3 renamed it `v-enter-from` (and `v-leave` → `v-leave-from`).

## Triggers and modes

`<Transition>` reacts to `v-if`, `v-show`, dynamic `<component :is>` and changes of `key`. When swapping two elements, use `mode="out-in"` so the old one leaves before the new one enters:

```vue
<Transition name="slide" mode="out-in">
  <component :is="currentView" :key="currentTab" />
</Transition>
```

Other props: `appear` (animate on first render), `:duration`, custom class names (`enter-active-class="animate__animated animate__fadeIn"`), and JavaScript hooks (`@before-enter`, `@enter(el, done)`, `@leave(el, done)`) for libraries like GSAP. Set `:css="false"` when you animate fully in JavaScript.

## Lists: `<TransitionGroup>`

For `v-for` lists use `<TransitionGroup>`. Differences from `<Transition>`:

- It renders a real wrapper element when you pass `tag` (`tag="ul"`); otherwise it renders only the children.
- Every child **must have a unique `key`**.
- `mode` is not available.
- It adds a `*-move` class to items that change position, animating reorders with CSS transforms (FLIP):

```css
.list-move,
.list-enter-active,
.list-leave-active { transition: all 0.3s ease; }
.list-enter-from,
.list-leave-to { opacity: 0; transform: translateX(24px); }
.list-leave-active { position: absolute; }
```

`position: absolute` on leaving items lets the remaining items move smoothly into the gap.

## Pitfalls

- `<Transition>` accepts a single root child. A component with multiple root nodes cannot be transitioned.
- Classes are applied to the **direct child**. If you transition a component, its root element receives them.
- Respect users who prefer reduced motion: wrap animations in `@media (prefers-reduced-motion: no-preference)`.
- In unit tests, Vue Test Utils stubs `Transition` and `TransitionGroup` by default so elements appear and disappear synchronously.
