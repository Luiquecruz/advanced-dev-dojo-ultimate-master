<script setup lang="ts">
import { onMounted } from 'vue';
import { useTodosStore } from './store';

const store = useTodosStore();

// TODO: fetch the todos when the component mounts
</script>

<template>
  <section>
    <p v-if="store.loading">Loading…</p>
    <p v-else-if="store.error" role="alert">{{ store.error }}</p>
    <template v-else>
      <ul>
        <li v-for="todo in store.todos" :key="todo.id">
          <label>
            <!-- TODO: bind :checked to todo.completed and toggle the todo on change -->
            <input type="checkbox" />
            {{ todo.title }}
          </label>
        </li>
      </ul>
      <p>{{ store.remaining }} remaining</p>
    </template>
  </section>
</template>
