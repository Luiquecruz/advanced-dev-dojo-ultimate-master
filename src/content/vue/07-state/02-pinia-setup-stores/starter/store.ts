import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

export const useTodosStore = defineStore('todos', () => {
  const todos = ref<Todo[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // TODO: remaining — computed count of todos that are not completed
  const remaining = computed(() => 0);

  async function fetchTodos() {
    // TODO: set loading, GET /api/todos, store the result
    // TODO: on a failed response set error to "Failed to load todos"; always clear loading at the end
  }

  function toggle(id: number) {
    // TODO: flip the completed flag of the todo with this id
  }

  // TODO: write a $reset() action that restores the initial state

  return { todos, loading, error, remaining, fetchTodos, toggle };
});
