<script setup lang="ts">
import { onWatcherCleanup, ref, watch } from 'vue';

interface Post {
  id: number;
  userId: number;
  title: string;
}

const authors = [
  { id: 1, name: 'Ada Lovelace' },
  { id: 2, name: 'Alan Turing' },
  { id: 4, name: 'Linus Torvalds' },
];

const userId = ref(1);
const posts = ref<Post[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

watch(
  userId,
  async (id) => {
    const controller = new AbortController();
    onWatcherCleanup(() => controller.abort());

    loading.value = true;
    error.value = null;
    try {
      const response = await fetch(`/api/posts?userId=${id}`, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      posts.value = await response.json();
    } catch (caught) {
      if (controller.signal.aborted) {
        return;
      }
      posts.value = [];
      error.value = 'Could not load posts.';
    }
    loading.value = false;
  },
  { immediate: true },
);
</script>

<template>
  <label>
    Author
    <select v-model="userId">
      <option v-for="author in authors" :key="author.id" :value="author.id">{{ author.name }}</option>
    </select>
  </label>

  <p v-if="loading">Loading posts…</p>
  <p v-else-if="error" role="alert">{{ error }}</p>
  <p v-else-if="posts.length === 0">No posts yet.</p>
  <ul v-else>
    <li v-for="post in posts" :key="post.id">{{ post.title }}</li>
  </ul>
</template>
