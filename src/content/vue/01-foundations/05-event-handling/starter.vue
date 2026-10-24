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
  // TODO: read the input value, push it trimmed into tags and clear the input
}
</script>

<template>
  <!-- TODO: call submit on submit and prevent the page reload -->
  <form>
    <button type="submit">Send</button>
  </form>
  <p>Submitted {{ submissions }} times</p>

  <!-- TODO: count card clicks, but not the clicks on Like -->
  <div class="card">
    <p>Card clicks: {{ cardClicks }}</p>
    <button>Like</button>
    <span>Likes: {{ likes }}</span>
  </div>

  <!-- TODO: add 10 to bonus only once -->
  <button>Claim bonus</button>
  <p>Bonus: {{ bonus }}</p>

  <!-- TODO: call addTag when Enter is pressed -->
  <input aria-label="New tag" />
  <ul>
    <li v-for="tag in tags" :key="tag">{{ tag }}</li>
  </ul>
</template>
