## Logical place vs visual place

A modal belongs **logically** to the component that opens it: it uses that component's state and events. **Visually**, it should sit on top of everything. If it is rendered deep inside a card with `overflow: hidden`, `transform` or a low `z-index` stacking context, it gets clipped or hidden.

`<Teleport>` renders its content into another place in the DOM while keeping it in the same component tree:

```vue
<button @click="open = true">Open</button>

<Teleport to="body">
  <div v-if="open" class="modal" role="dialog" aria-modal="true">
    <p>Hello from the body!</p>
    <button @click="open = false">Close</button>
  </div>
</Teleport>
```

- `to` takes a CSS selector (`"body"`, `"#modals"`) or an element. The target must exist when the Teleport mounts.
- Only the **DOM** moves. Props, events, provide/inject and reactivity work as if the content were still inside the component.
- When the component unmounts, the teleported content is removed too.

## Options

```vue
<Teleport to="#modals" :disabled="isMobile">...</Teleport>
<Teleport defer to="#late-target">...</Teleport>
```

- `disabled`: render in place instead (e.g. inline on small screens).
- `defer` (Vue 3.5): resolve the target after the current render, so it can point to an element rendered later in the same app.
- Several Teleports to the same target append in order.

## Building a reusable modal

```vue
<!-- ModalDialog.vue -->
<script setup lang="ts">
const { open, title } = defineProps<{ open: boolean; title: string }>();
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="backdrop" @click.self="emit('close')">
      <div role="dialog" aria-modal="true" :aria-label="title" @keydown.esc="emit('close')">
        <h2>{{ title }}</h2>
        <slot />
        <button @click="emit('close')">Close</button>
      </div>
    </div>
  </Teleport>
</template>
```

`@click.self` closes only when the backdrop itself is clicked, not its content.

## Accessibility notes

A real dialog should move focus inside when opening, trap focus, close on Escape and return focus to the trigger. The native `<dialog>` element with `showModal()` handles much of this and renders in the browser's **top layer**, which also solves clipping. Teleport remains useful for toasts, popovers, dropdowns and custom dialogs.

## History

Vue 2 had no built-in teleport; projects used the `portal-vue` library. Vue 3 originally called the feature `<Portal>` during alpha before naming it `<Teleport>`. In React the equivalent is `createPortal`, in Angular the CDK Portal.

## Testing

Teleported content is not inside `wrapper.element`. Query `document.body` (Testing Library's `screen` does that), or stub Teleport with `global: { stubs: { teleport: true } }`.
