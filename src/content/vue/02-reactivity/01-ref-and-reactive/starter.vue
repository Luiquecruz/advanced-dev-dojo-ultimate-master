<script setup lang="ts">
import { reactive, ref } from 'vue';

// TODO: declare score with ref(0)
const score = { value: 0 };
// TODO: declare player with reactive()
const player = { name: 'Ada', history: [] as number[] };

function addPoints(points: number) {
  // TODO: add points to score and record them in player.history
}

function resetGame() {
  // TODO: reset the score and clear the history in place
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
