<script setup lang="ts">
import { ref } from 'vue';

const tabs = ['Home', 'Profile', 'Settings'];
const activeTab = ref('Home');
const level = ref<'info' | 'warning' | 'error'>('warning');
const dismissible = ref(true);
const progress = ref(40);

function advance() {
  progress.value = Math.min(100, progress.value + 30);
}
</script>

<template>
  <nav>
    <!-- TODO: add the active class with the object syntax -->
    <button v-for="tab in tabs" :key="tab" class="tab" @click="activeTab = tab">{{ tab }}</button>
  </nav>

  <!-- TODO: add alert-<level> and dismissible with the array syntax -->
  <div class="alert" role="status">Your trial ends soon</div>
  <button @click="level = 'error'">Make it an error</button>
  <button @click="dismissible = false">Pin alert</button>

  <div class="track">
    <!-- TODO: bind width and backgroundColor -->
    <div class="bar" data-testid="bar"></div>
  </div>
  <button @click="advance">+30</button>
</template>

<style scoped>
.tab { padding: 4px 12px; border: 0; background: none; }
.tab.active { border-bottom: 2px solid #42b883; font-weight: 600; }
.alert { padding: 8px; border-radius: 4px; }
.alert-warning { background: #fff3cd; }
.alert-error { background: #f8d7da; }
.track { height: 8px; background: #eee; }
.bar { height: 100%; }
</style>
