<script setup lang="ts">
const rating = defineModel<number>({ default: 0 });
const comment = defineModel<string>('comment', { default: '' });
</script>

<template>
  <div class="rating">
    <button
      v-for="star in 5"
      :key="star"
      type="button"
      :aria-label="`Rate ${star}`"
      :aria-pressed="star <= rating"
      @click="rating = star"
    >★</button>
    <textarea v-model="comment" aria-label="Comment"></textarea>
  </div>
</template>

<style scoped>
button { border: none; background: none; font-size: 1.5rem; color: #bbb; cursor: pointer; }
button[aria-pressed='true'] { color: #f5a623; }
textarea { display: block; margin-top: 0.5rem; width: 100%; }
</style>
