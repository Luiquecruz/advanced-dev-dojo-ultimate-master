<script setup lang="ts">
const { open, title } = defineProps<{ open: boolean; title: string }>();

const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="backdrop" @click.self="emit('close')">
      <div role="dialog" aria-modal="true" :aria-label="title" @keydown.esc="emit('close')">
        <h2>{{ title }}</h2>
        <slot />
        <button @click="emit('close')">Close</button>
      </div>
    </div>
  </Teleport>
</template>

<style>
.backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / 0.4); display: grid; place-items: center; }
.backdrop [role='dialog'] { background: #fff; color: #222; padding: 1rem 1.5rem; border-radius: 8px; }
</style>
