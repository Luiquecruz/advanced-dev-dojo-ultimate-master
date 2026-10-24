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

// TODO: watch userId (immediately) and fetch `/api/posts?userId=<id>`
// TODO: create an AbortController per run and abort it with onWatcherCleanup
// TODO: set loading, store the posts, or set error to "Could not load posts." on failure
</script>

<template>
  <label>
    Author
    <select v-model="userId">
      <option v-for="author in authors" :key="author.id" :value="author.id">{{ author.name }}</option>
    </select>
  </label>

  <!-- TODO: render the loading, error, empty and list states -->
</template>
