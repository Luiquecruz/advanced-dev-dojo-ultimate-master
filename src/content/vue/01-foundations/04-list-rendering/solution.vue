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
  <ul v-if="todos.length">
    <li v-for="(todo, index) in todos" :key="todo.id">
      <span>{{ index + 1 }}. {{ todo.text }}</span>
      <button @click="remove(todo.id)">Remove</button>
    </li>
  </ul>
  <p v-else>All done!</p>
</template>
