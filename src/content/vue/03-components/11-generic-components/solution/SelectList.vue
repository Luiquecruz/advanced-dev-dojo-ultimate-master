<script setup lang="ts" generic="T extends { id: number }">
const { items, selected = null } = defineProps<{ items: T[]; selected?: T | null }>();

const emit = defineEmits<{ select: [item: T] }>();

defineSlots<{
  default(props: { item: T; selected: boolean }): any;
}>();
</script>

<template>
  <ul role="listbox">
    <li
      v-for="item in items"
      :key="item.id"
      role="option"
      :aria-selected="selected?.id === item.id"
      @click="emit('select', item)"
    >
      <slot :item="item" :selected="selected?.id === item.id">{{ item.id }}</slot>
    </li>
  </ul>
</template>

<style scoped>
li { cursor: pointer; padding: 0.25rem 0.5rem; }
li[aria-selected='true'] { background: #e6f6ee; }
</style>
