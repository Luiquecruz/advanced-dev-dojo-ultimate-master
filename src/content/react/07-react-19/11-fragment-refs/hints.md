Replace the `<span>` with `<Fragment ref={fragmentRef}>`. The ref then holds a `FragmentInstance`, not a DOM element.
---
In the effect: `const fragment = fragmentRef.current; const listener = (event) => onPress(event.currentTarget.textContent); fragment.addEventListener('click', listener);`
---
Return `() => fragment.removeEventListener('click', listener)` so each new `onPress` replaces the previous listener. For focus: `if (autoFocus) fragmentRef.current.focus();`.
