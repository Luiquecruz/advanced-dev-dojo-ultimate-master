import type { App as VueApp } from 'vue';
import App from './App.vue';
import { router } from './router';

export function configureApp(app: VueApp) {
  app.use(router);
}

export default App;
