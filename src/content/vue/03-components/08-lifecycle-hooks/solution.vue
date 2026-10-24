<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

const width = ref(0);

function update() {
  width.value = window.innerWidth;
}

onMounted(() => {
  update();
  window.addEventListener('resize', update);
});

onUnmounted(() => {
  window.removeEventListener('resize', update);
});
</script>

<template>
  <p class="width">Width: {{ width }}px</p>
</template>
