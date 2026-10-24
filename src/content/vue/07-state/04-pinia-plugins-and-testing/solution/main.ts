import type { App as VueApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { persistPlugin } from './persist';

export function configureApp(app: VueApp) {
  const pinia = createPinia();
  pinia.use(persistPlugin);
  app.use(pinia);
}

export default App;
