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

  const remaining = computed(() => todos.value.filter((todo) => !todo.completed).length);

  async function fetchTodos() {
    loading.value = true;
    error.value = null;
    try {
      const response = await fetch('/api/todos');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      todos.value = await response.json();
    } catch {
      error.value = 'Failed to load todos';
    } finally {
      loading.value = false;
    }
  }

  function toggle(id: number) {
    const todo = todos.value.find((entry) => entry.id === id);
    if (todo) {
      todo.completed = !todo.completed;
    }
  }

  function $reset() {
    todos.value = [];
    loading.value = false;
    error.value = null;
  }

  return { todos, loading, error, remaining, fetchTodos, toggle, $reset };
});
