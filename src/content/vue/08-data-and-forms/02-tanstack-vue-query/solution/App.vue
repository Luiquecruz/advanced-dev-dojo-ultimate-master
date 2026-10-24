<script setup lang="ts">
import { ref } from 'vue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { createTodo, fetchTodos } from './api';

const queryClient = useQueryClient();
const title = ref('');

const { data: todos, isPending, isError } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
});

const addTodo = useMutation({
  mutationFn: createTodo,
  onSuccess: () => {
    title.value = '';
    return queryClient.invalidateQueries({ queryKey: ['todos'] });
  },
});

function submit() {
  if (title.value.trim() !== '') {
    addTodo.mutate(title.value.trim());
  }
}
</script>

<template>
  <form @submit.prevent="submit">
    <input v-model="title" aria-label="New todo" />
    <button type="submit" :disabled="addTodo.isPending.value">Add</button>
  </form>
  <p v-if="isPending">Loading todos…</p>
  <p v-else-if="isError" role="alert">Could not load todos.</p>
  <ul v-else>
    <li v-for="todo in todos" :key="todo.id">{{ todo.title }}</li>
  </ul>
</template>
