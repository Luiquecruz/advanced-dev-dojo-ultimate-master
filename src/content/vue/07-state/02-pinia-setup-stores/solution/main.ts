import type { App as VueApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

export function configureApp(app: VueApp) {
  app.use(createPinia());
}

export default App;
