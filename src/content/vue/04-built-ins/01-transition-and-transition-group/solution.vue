<script setup lang="ts">
import { ref } from 'vue';

const open = ref(false);
const notifications = ref([
  { id: 1, text: 'Notification 1' },
  { id: 2, text: 'Notification 2' },
]);
let nextId = 3;

function add() {
  const id = nextId++;
  notifications.value.push({ id, text: `Notification ${id}` });
}

function dismiss(id: number) {
  notifications.value = notifications.value.filter((notification) => notification.id !== id);
}
</script>

<template>
  <button @click="open = !open">{{ open ? 'Hide details' : 'Show details' }}</button>
  <Transition name="fade">
    <p v-if="open" class="details">Vue transitions are CSS driven.</p>
  </Transition>

  <button @click="add">Add notification</button>
  <TransitionGroup name="list" tag="ul">
    <li v-for="notification in notifications" :key="notification.id">
      {{ notification.text }}
      <button aria-label="Dismiss" @click="dismiss(notification.id)">×</button>
    </li>
  </TransitionGroup>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(24px);
}
.list-leave-active {
  position: absolute;
}
</style>
