import { createMemoryHistory, createRouter } from 'vue-router';
import HomeView from './HomeView.vue';
import AboutView from './AboutView.vue';
import NotFoundView from './NotFoundView.vue';

export const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    // TODO: map "/" (name "home") to HomeView
    // TODO: map "/about" (name "about") to AboutView
    // TODO: add a catch-all route (name "not-found") rendering NotFoundView
  ],
});
