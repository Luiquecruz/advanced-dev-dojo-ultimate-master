<template>
  <article class="card">
    <header><slot name="header">Untitled</slot></header>
    <div class="body"><slot /></div>
    <footer v-if="$slots.footer"><slot name="footer" /></footer>
  </article>
</template>

<style scoped>
.card { border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
header { font-weight: 600; padding: 0.5rem 0.75rem; background: #f4f4f4; }
.body, footer { padding: 0.5rem 0.75rem; }
</style>
