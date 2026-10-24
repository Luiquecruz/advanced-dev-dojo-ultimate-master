<script setup lang="ts">
import { reactive, ref } from 'vue';

const score = ref(0);
const player = reactive({ name: 'Ada', history: [] as number[] });

function addPoints(points: number) {
  score.value += points;
  player.history.push(points);
}

function resetGame() {
  score.value = 0;
  player.history.length = 0;
}
</script>

<template>
  <h2>{{ player.name }}: {{ score }}</h2>
  <button @click="addPoints(1)">+1</button>
  <button @click="addPoints(5)">+5</button>
  <button @click="resetGame">Reset</button>
  <ol>
    <li v-for="(points, index) in player.history" :key="index">{{ points }}</li>
  </ol>
</template>
