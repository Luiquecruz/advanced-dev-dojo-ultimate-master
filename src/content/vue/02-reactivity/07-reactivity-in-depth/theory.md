## The idea: track reads, trigger writes

Every reactive system answers two questions: **who depends on this value?** and **who must re-run when it changes?** Vue answers them at runtime:

1. While an **effect** runs (a component render, a `computed` getter, a watcher), Vue marks it as the *active subscriber*.
2. Every reactive **read** during that run records a dependency: "this effect depends on `state.count`" (**track**).
3. Every reactive **write** looks up the subscribers of that property and schedules them (**trigger**).

Dependencies are recollected on every run, so conditional code is handled correctly: if a branch stops reading `b`, the effect stops depending on `b`.

## Proxies and refs

`reactive()` returns a JavaScript `Proxy`. Simplified:

```js
function reactive(target) {
  return new Proxy(target, {
    get(obj, key, receiver) {
      track(obj, key);
      const value = Reflect.get(obj, key, receiver);
      return isObject(value) ? reactive(value) : value; // lazy deep conversion
    },
    set(obj, key, value, receiver) {
      const result = Reflect.set(obj, key, value, receiver);
      trigger(obj, key);
      return result;
    },
  });
}
```

`ref()` cannot use a Proxy for primitives, so it is an object with a `value` getter and setter that call `track` / `trigger`. That is why script code needs `.value`: the property access **is** the tracking hook.

Proxies also intercept `has` (`key in obj`), `deleteProperty` and `ownKeys` (`Object.keys`, `for...in`), and Vue instruments array and collection methods (`push`, `includes`, `Map.prototype.get`...). Vue 2 used `Object.defineProperty`, which could not see new properties or index assignments; Proxies removed those caveats (and dropped IE11 support).

## The scheduler and `nextTick`

Triggering does not re-render immediately. Component updates and `pre`/`post` watchers are pushed into a **queue** that is flushed in a microtask. Ten synchronous writes produce one render, and parents are updated before children.

```ts
count.value++;
console.log(el.textContent); // old text
await nextTick();
console.log(el.textContent); // updated
```

`nextTick()` returns a promise for the end of the current flush. Computed values are different: they are **pull-based** and lazy, recomputed only when read after a dependency changed.

## Vue 3.5: a leaner core

Vue 3.5 rewrote `@vue/reactivity` internals with **version counting** and a **doubly-linked list** of dependency links (ideas shared with Preact Signals). The announcement reports about **56% less memory** use, no behavior changes, and up to 10x faster operations on large, deeply reactive arrays. Computed values became fully lazy and stop propagating when they recompute to the same value.

## Vue 3.6: alien-signals and Vapor Mode

Vue 3.6 (release-candidate stage as of October 2026) brings two big changes:

- `@vue/reactivity` is refactored on top of **alien-signals**, a signal algorithm written by Johnson Chu (a Vue core team member) that the changelog says *"significantly improves the reactivity system's performance and memory usage"*. Public APIs (`ref`, `computed`, `watch`) stay the same.
- **Vapor Mode**, an opt-in compilation mode for SFCs. Instead of producing a render function that returns virtual DOM to diff, the compiler emits code that creates the DOM once and binds each dynamic part to its own fine-grained effect. The Vue team reports performance on the level of Solid and Svelte 5. It supports `<script setup>` and template-only components (not the Options API), can be mixed with regular components through `vaporInteropPlugin`, or used for a whole app with `createVaporApp()`.

This is possible precisely because the reactivity system already knows *which* binding depends on *which* state: Vapor simply stops re-running the whole component render.

## Signals everywhere

Vue's refs are signals under another name. Solid, Preact, Angular (`signal()`, `computed()`, `effect()`) and Svelte 5 runes use the same model, and a TC39 proposal aims to standardize it. Knowing Vue's reactivity transfers directly.

## Debugging and scopes

- `onRenderTracked` / `onRenderTriggered` lifecycle hooks and the `onTrack` / `onTrigger` options of `computed` and watchers (development only) show which dependency caused a run.
- `effectScope()` groups effects so they can be stopped together, which is how components and libraries (VueUse, Pinia) dispose watchers.

## Common misconceptions

- "Reactivity is deep copying": no, it wraps the same object.
- "Changing state updates the DOM synchronously": no, updates are batched until the next tick.
- "Everything I put in `ref()` is fast": tracking has a cost; large immutable data belongs in `shallowRef` or `markRaw`.
