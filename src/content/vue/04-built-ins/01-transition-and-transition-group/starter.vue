<script setup lang="ts">
import { ref } from 'vue';

const open = ref(false);
const notifications = ref([
  { id: 1, text: 'Notification 1' },
  { id: 2, text: 'Notification 2' },
]);
let nextId = 3;

function add() {
  // TODO: append a new notification
}

function dismiss(id: number) {
  // TODO: remove the notification
}
</script>

<template>
  <button @click="open = !open">{{ open ? 'Hide details' : 'Show details' }}</button>
  <!-- TODO: wrap the paragraph in <Transition name="fade"> and render it only when open -->
  <p class="details">Vue transitions are CSS driven.</p>

  <button @click="add">Add notification</button>
  <!-- TODO: render the notifications inside <TransitionGroup name="list" tag="ul"> -->
</template>

<style>
/* TODO: fade-* and list-* transition classes */
</style>
