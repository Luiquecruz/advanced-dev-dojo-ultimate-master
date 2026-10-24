Animate a details panel and a notification list in `App.vue`.

1. A button toggles `open`. Its text is `Show details` when closed and `Hide details` when open.
2. Wrap `<p class="details">Vue transitions are CSS driven.</p>` (rendered with `v-if="open"`) in `<Transition name="fade">`.
3. Render the notifications with `<TransitionGroup name="list" tag="ul">`, one keyed `<li>` per notification containing its text and a `<button>` labelled `Dismiss` (`aria-label="Dismiss"`) that removes it.
4. A button `Add notification` appends `{ id, text: "Notification N" }` where N is the new id (ids continue from 2).
5. In `<style>`, define `.fade-enter-active`, `.fade-leave-active`, `.fade-enter-from`, `.fade-leave-to` and the matching `.list-*` classes, including `.list-move`.
