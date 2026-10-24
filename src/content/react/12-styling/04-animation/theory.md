## Animating React UI

Most UI motion needs no library. The browser already animates CSS properties on its compositor thread, which is smoother than updating state on every frame.

```css
.panel { transition: opacity 200ms ease, transform 200ms ease; }
.panel[data-state='closed'] { opacity: 0; transform: translateY(-4px); }

@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
.fade-in { animation: fade-in 200ms ease-out; }
```

React's job is to **toggle a class or an attribute**; CSS does the motion. Animate `transform` and `opacity` when you can: they do not trigger layout, so they stay at 60fps.

## The exit problem

Enter animations are easy: an element appears with an animation class. Exits are hard, because this removes the node **immediately**:

```jsx
{open && <div className="fade-out">...</div>}
```

There is no DOM left to animate. The fix is to keep the element mounted in a "closing" state and unmount it when the animation finishes. React exposes `onAnimationEnd` and `onTransitionEnd`:

```jsx
function Toast({ visible, children }) {
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);

  if (!mounted) return null;
  return (
    <div
      data-state={visible ? 'open' : 'closed'}
      onAnimationEnd={() => {
        if (!visible) setMounted(false);
      }}
    >
      {children}
    </div>
  );
}
```

Note `if (visible && !mounted) setMounted(true)`: setting state **during render** when a prop changes is the documented way to adjust state without an extra Effect pass.

## Respect reduced motion

Some people get dizzy or nauseous from motion. Operating systems expose a "reduce motion" setting, available as a media query:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

In JavaScript, read it with `matchMedia`. Because it is an external, changing value, `useSyncExternalStore` is the right hook:

```js
const query = '(prefers-reduced-motion: reduce)';

function subscribe(onChange) {
  const media = window.matchMedia(query);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}
```

The third argument is the server snapshot: during SSR there is no `window`, so assume `false`. When motion is reduced, skip the exit animation entirely, because `animationend` may never fire if no animation runs.

## Libraries and modern APIs

- **Motion** (formerly Framer Motion, now imported from `motion/react`): declarative `animate`, `exit` with `<AnimatePresence>`, layout animations, gestures and springs. It implements exactly the "stay mounted until the exit finishes" logic for you.
- **React Spring** and **GSAP**: physics springs and timeline-based animation.
- **Web Animations API**: `element.animate(keyframes, options)` returns an `Animation` with a `finished` promise. Call it from an Effect or event handler with a ref.
- **View Transitions**: the browser snapshots the old and new UI and cross-fades them. React wraps it with `<ViewTransition>`, which animates updates triggered inside `startTransition`. It is covered in the React 19 module.
- **CSS-only entry**: `@starting-style` and `transition-behavior: allow-discrete` can now animate elements appearing from `display: none`.

## Pitfalls

- Animating `width`, `height`, `top` or `left` triggers layout on every frame. Prefer `transform: scale()` and `translate()`.
- `onAnimationEnd` bubbles: a child's animation also fires it. Check `event.target === event.currentTarget` when children animate too.
- Never store per-frame values in React state; use CSS, a ref, or a library that writes styles directly.
- Ignoring `prefers-reduced-motion` is an accessibility failure (WCAG 2.3.3).
