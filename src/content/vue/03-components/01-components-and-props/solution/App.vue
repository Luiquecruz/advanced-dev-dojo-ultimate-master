<script setup lang="ts">
import UserCard from './UserCard.vue';

const users = [
  { id: 1, name: 'Ada Lovelace', role: 'Admin', online: true },
  { id: 2, name: 'Alan Turing', role: 'Editor', online: false },
  { id: 3, name: 'Grace Hopper', online: true },
];
</script>

<template>
  <section>
    <UserCard
      v-for="user in users"
      :key="user.id"
      :name="user.name"
      :role="user.role"
      :online="user.online"
    />
  </section>
</template>
