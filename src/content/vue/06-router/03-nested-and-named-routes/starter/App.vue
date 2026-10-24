<template>
  <nav>
    <RouterLink to="/">Home</RouterLink>
    <RouterLink to="/settings/profile">Settings</RouterLink>
  </nav>
  <main>
    <RouterView />
  </main>
  <aside>
    <!-- TODO: render the "sidebar" named view -->
  </aside>
</template>
