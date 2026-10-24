import { createMemoryHistory, createRouter } from 'vue-router';
import UserView from './UserView.vue';
import NotFoundView from './NotFoundView.vue';

export const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', redirect: { name: 'user', params: { id: 1 } } },
    { path: '/users/:id(\\d+)', name: 'user', component: UserView, props: true },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
  ],
});
