import { createMemoryHistory, createRouter } from 'vue-router';
import HomeView from './HomeView.vue';
import AboutView from './AboutView.vue';
import NotFoundView from './NotFoundView.vue';

export const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/about', name: 'about', component: AboutView },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
  ],
});
