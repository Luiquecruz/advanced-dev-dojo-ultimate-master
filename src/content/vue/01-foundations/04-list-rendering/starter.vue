<script setup lang="ts">
import { ref } from 'vue';

const todos = ref([
  { id: 1, text: 'Learn Vue' },
  { id: 2, text: 'Build an app' },
  { id: 3, text: 'Ship it' },
]);

function remove(id: number) {
  todos.value = todos.value.filter((todo) => todo.id !== id);
}
</script>

<template>
  <ul>
    <!-- TODO: render one <li> per todo, keyed by id, with a <span> and a Remove button -->
  </ul>
  <!-- TODO: render <p>All done!</p> when the list is empty -->
</template>
