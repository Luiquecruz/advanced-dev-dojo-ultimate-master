`<Transition name="fade">` wraps exactly one element. Put `v-if="open"` on the paragraph inside it.
---
`<TransitionGroup name="list" tag="ul">` replaces the `<ul>`; give each `<li>` a `:key="notification.id"`.
---
The CSS pairs are `*-enter-active`/`*-leave-active` (the `transition` property) and `*-enter-from`/`*-leave-to` (opacity 0). Add `.list-move` to the same rule as the active classes.
