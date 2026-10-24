<template>
  <nav>
    <RouterLink :to="{ name: 'home' }">Home</RouterLink>
    <RouterLink :to="{ name: 'settings-profile' }">Settings</RouterLink>
  </nav>
  <main>
    <RouterView />
  </main>
  <aside>
    <RouterView name="sidebar" />
  </aside>
</template>
