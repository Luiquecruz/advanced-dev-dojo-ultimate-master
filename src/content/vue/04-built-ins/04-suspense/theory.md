## Async setup

A `<script setup>` block may use **top-level `await`**. The compiler turns `setup()` into an `async` function:

```vue
<!-- UserProfile.vue -->
<script setup lang="ts">
const { userId } = defineProps<{ userId: number }>();

const response = await fetch(`/api/users/${userId}`);
if (!response.ok) throw new Error(`Request failed: ${response.status}`);
const user = await response.json();
</script>

<template>
  <h2>{{ user.name }}</h2>
</template>
```

The template can assume `user` exists: no `v-if="user"`, no loading flags. But an async component cannot render on its own. It needs an ancestor `<Suspense>` boundary to wait for it.

## `<Suspense>` (experimental)

`<Suspense>` renders its `#default` slot in memory and waits until **every async dependency** inside it (async setups, and async components) has resolved. Meanwhile it shows the `#fallback` slot:

```vue
<Suspense>
  <UserProfile :user-id="1" />
  <template #fallback>
    <p>Loading…</p>
  </template>
</Suspense>
```

One boundary can wait for many nested async components, so you get a single loading state instead of a cascade of spinners.

Events: `@pending`, `@resolve`, `@fallback`. The `timeout` prop controls how long the old content stays visible before showing the fallback when the default content changes again.

> Suspense is still marked **experimental** in Vue 3.5; its API may change. It is widely used (Nuxt relies on it), but read the release notes when upgrading.

## Handling errors

Suspense has no error slot. Errors thrown in async setup propagate to ancestors, where you capture them with `onErrorCaptured`:

```ts
const error = ref<string | null>(null);

onErrorCaptured((err) => {
  error.value = err.message;
  return false; // stop propagation to the app error handler
});
```

```vue
<p v-if="error" role="alert">Could not load user</p>
<Suspense v-else>...</Suspense>
```

## Pitfalls

- **Hooks after `await`**: in `<script setup>` the compiler restores the instance after each top-level `await`, so `onMounted` still works. In a hand-written `async setup()`, register hooks **before** the first `await`.
- **Re-fetching**: an async setup runs once. When `userId` changes the component does not re-fetch. Add `:key="userId"` to recreate it (Suspense then waits again), or use a composable with `watch` instead.
- **Waterfalls**: sequential awaits in parent and child fetch one after the other. Start independent requests together (`Promise.all`) or move fetching to a data layer (TanStack Query, Nuxt `useFetch`).

## Combining with other built-ins

The recommended nesting order is:

```vue
<RouterView v-slot="{ Component }">
  <Transition mode="out-in">
    <KeepAlive>
      <Suspense>
        <component :is="Component" />
      </Suspense>
    </KeepAlive>
  </Transition>
</RouterView>
```

## Options API comparison

The Options API has no top-level await; `async setup()` inside an Options component works the same way, or you fetch in `created()` and manage `loading` yourself.
