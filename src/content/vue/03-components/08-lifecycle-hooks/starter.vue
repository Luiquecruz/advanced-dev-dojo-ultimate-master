<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

const width = ref(0);

function update() {
  // TODO: copy window.innerWidth into width
}

// TODO: in onMounted, call update and listen to window resize

// TODO: in onUnmounted, remove the resize listener
</script>

<template>
  <p class="width">Width: {{ width }}px</p>
</template>
