import type { App as VueApp } from 'vue';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import App from './App.vue';

export function configureApp(app: VueApp) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });
  app.use(VueQueryPlugin, { queryClient });
}

export default App;
