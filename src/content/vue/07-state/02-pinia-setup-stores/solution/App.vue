<script setup lang="ts">
import { onMounted } from 'vue';
import { useTodosStore } from './store';

const store = useTodosStore();

onMounted(() => store.fetchTodos());
</script>

<template>
  <section>
    <p v-if="store.loading">Loading…</p>
    <p v-else-if="store.error" role="alert">{{ store.error }}</p>
    <template v-else>
      <ul>
        <li v-for="todo in store.todos" :key="todo.id">
          <label>
            <input type="checkbox" :checked="todo.completed" @change="store.toggle(todo.id)" />
            {{ todo.title }}
          </label>
        </li>
      </ul>
      <p>{{ store.remaining }} remaining</p>
    </template>
  </section>
</template>
