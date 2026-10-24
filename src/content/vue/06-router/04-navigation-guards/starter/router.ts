import { createMemoryHistory, createRouter } from 'vue-router';
import { auth } from './auth';
import HomeView from './HomeView.vue';
import DashboardView from './DashboardView.vue';
import LoginView from './LoginView.vue';
import EditorView from './EditorView.vue';

declare module 'vue-router' {
  interface RouteMeta {
    title: string;
    requiresAuth?: boolean;
  }
}

export const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView, meta: { title: 'Home' } },
    { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { title: 'Dashboard', requiresAuth: true } },
    { path: '/login', name: 'login', component: LoginView, meta: { title: 'Login' } },
    { path: '/editor', name: 'editor', component: EditorView, meta: { title: 'Editor' } },
  ],
});

// TODO: redirect guests away from routes with meta.requiresAuth to "login", keeping the target in ?redirect=
// TODO: after each navigation, set document.title to "<meta.title> · Dojo"
