<template>
  <section>
    <h1>Settings</h1>
    <nav>
      <RouterLink :to="{ name: 'settings-profile' }">Profile</RouterLink>
      <RouterLink :to="{ name: 'settings-account' }">Account</RouterLink>
    </nav>
    <RouterView />
  </section>
</template>
