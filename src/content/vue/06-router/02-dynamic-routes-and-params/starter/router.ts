import { createMemoryHistory, createRouter } from 'vue-router';
import UserView from './UserView.vue';
import NotFoundView from './NotFoundView.vue';

export const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', redirect: '/users/1' },
    // TODO: add the "user" route for /users/:id (digits only), passing the param as a prop
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
  ],
});
