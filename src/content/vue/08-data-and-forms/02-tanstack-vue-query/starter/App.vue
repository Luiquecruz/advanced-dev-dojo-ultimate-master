<script setup lang="ts">
import { ref } from 'vue';
import { createTodo, fetchTodos, type Todo } from './api';

const title = ref('');

// TODO: replace this placeholder with useQuery({ queryKey: ['todos'], queryFn: fetchTodos })
const todos = ref<Todo[]>([]);
const isPending = ref(false);
const isError = ref(false);

// TODO: create a mutation with createTodo that clears the input and invalidates ['todos'] on success

function submit() {
  // TODO: run the mutation with the trimmed title (ignore empty titles)
}
</script>

<template>
  <form @submit.prevent="submit">
    <input v-model="title" aria-label="New todo" />
    <button type="submit">Add</button>
  </form>
  <p v-if="isPending">Loading todos…</p>
  <p v-else-if="isError" role="alert">Could not load todos.</p>
  <ul v-else>
    <li v-for="todo in todos" :key="todo.id">{{ todo.title }}</li>
  </ul>
</template>
