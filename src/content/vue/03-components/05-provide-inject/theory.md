## Prop drilling

When a value is needed deep in the tree, passing it through every intermediate component as a prop ("prop drilling") couples components that do not care about it. `provide` and `inject` let an ancestor make a value available to **any descendant**, however deep.

```ts
// Ancestor
import { provide, ref } from 'vue';
const theme = ref('light');
provide('theme', theme);

// Any descendant
import { inject } from 'vue';
const theme = inject('theme'); // the same ref
```

`inject` walks up the component tree and returns the closest provided value with that key.

## Typed keys with `InjectionKey`

String keys can collide and are typed as `unknown`. Use a `Symbol` typed with `InjectionKey`, exported from a shared file:

```ts
// keys.ts
import type { InjectionKey, Ref } from 'vue';

export interface ThemeContext {
  theme: Readonly<Ref<'light' | 'dark'>>;
  toggle: () => void;
}

export const ThemeKey: InjectionKey<ThemeContext> = Symbol('theme');
```

Now `inject(ThemeKey)` is typed as `ThemeContext | undefined`.

## Default values

The second argument is the value used when no ancestor provides the key. Without it, Vue logs a warning and returns `undefined`.

```ts
const context = inject(ThemeKey, { theme: ref('light'), toggle: () => {} });
// expensive defaults: pass a factory and `true`
const store = inject(StoreKey, () => createStore(), true);
```

## Keep reactivity, keep mutations near the state

- Provide a **ref or reactive object**, not `theme.value`: a plain value is copied once and never updates.
- Expose the state as `readonly(theme)` and provide **functions** that change it. Descendants can request changes, but only the provider mutates. This keeps data flow traceable, just like props and emits.

```ts
const theme = ref<'light' | 'dark'>('light');
provide(ThemeKey, {
  theme: readonly(theme),
  toggle: () => (theme.value = theme.value === 'light' ? 'dark' : 'light'),
});
```

## App-level provide

Plugins and app setup can provide to the whole app:

```ts
const app = createApp(App);
app.provide(ThemeKey, context);
```

This is how Vue Router (`useRouter`) and Pinia work internally. In tests, Vue Test Utils accepts `global: { provide: { [ThemeKey]: fakeContext } }`.

## Rules and pitfalls

- `inject` (and `provide`) must be called synchronously during `setup` (or inside a composable called from it). `hasInjectionContext()` tells you if you are in a valid context.
- A component **cannot inject what it provides itself**; injection starts from the parent.
- provide/inject is implicit coupling. Use it for cross-cutting context (theme, locale, form groups, compound components), not as a replacement for a store when many unrelated parts of the app share data.

## Options API comparison

```js
export default {
  provide() {
    return { theme: computed(() => this.theme) };
  },
  inject: { theme: { from: 'theme', default: 'light' } },
};
```

In Vue 2, provided values were not reactive unless you passed a reactive object; in Vue 3 you simply provide a ref or `computed`.
