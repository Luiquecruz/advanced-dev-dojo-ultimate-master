<script setup lang="ts">
import { ref } from 'vue';

const submissions = ref(0);
const cardClicks = ref(0);
const likes = ref(0);
const bonus = ref(0);
const tags = ref<string[]>([]);

function submit() {
  submissions.value++;
}

function addTag(event: KeyboardEvent) {
  const input = event.target as HTMLInputElement;
  const tag = input.value.trim();
  if (tag) {
    tags.value.push(tag);
  }
  input.value = '';
}
</script>

<template>
  <form @submit.prevent="submit">
    <button type="submit">Send</button>
  </form>
  <p>Submitted {{ submissions }} times</p>

  <div class="card" @click="cardClicks++">
    <p>Card clicks: {{ cardClicks }}</p>
    <button @click.stop="likes++">Like</button>
    <span>Likes: {{ likes }}</span>
  </div>

  <button @click.once="bonus += 10">Claim bonus</button>
  <p>Bonus: {{ bonus }}</p>

  <input aria-label="New tag" @keyup.enter="addTag" />
  <ul>
    <li v-for="tag in tags" :key="tag">{{ tag }}</li>
  </ul>
</template>
