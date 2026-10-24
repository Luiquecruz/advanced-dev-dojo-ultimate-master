const { createApp } = require('vue');
const { createPinia, setActivePinia } = require('pinia');
const { persistPlugin } = modules['persist.ts'];
const { useSettingsStore, useRecentStore, useDraftStore } = modules['stores.ts'];

function testPinia() {
  const pinia = createPinia();
  pinia.use(persistPlugin);
  createApp({}).use(pinia);
  setActivePinia(pinia);
  return pinia;
}

test('restores state saved under "pinia:<id>" when the store is created', () => {
  localStorage.clear();
  localStorage.setItem('pinia:settings', JSON.stringify({ theme: 'dark', fontSize: 20 }));
  testPinia();
  const settings = useSettingsStore();
  expect(settings.theme).toBe('dark');
  expect(settings.fontSize).toBe(20);
});

test('saves the whole state to localStorage on every change', () => {
  localStorage.clear();
  testPinia();
  const settings = useSettingsStore();
  settings.toggleTheme();
  expect(JSON.parse(localStorage.getItem('pinia:settings') ?? 'null')).toEqual({ theme: 'dark', fontSize: 16 });
});

test('works for setup stores declared with { persist: true }', () => {
  localStorage.clear();
  localStorage.setItem('pinia:recent', JSON.stringify({ searches: ['pinia'] }));
  testPinia();
  const recent = useRecentStore();
  recent.remember('vue');
  expect(recent.searches).toEqual(['vue', 'pinia']);
  expect(JSON.parse(localStorage.getItem('pinia:recent') ?? 'null')).toEqual({ searches: ['vue', 'pinia'] });
});

test('ignores stores without the persist option', () => {
  localStorage.clear();
  testPinia();
  useDraftStore().text = 'secret';
  expect(localStorage.getItem('pinia:draft')).toBeNull();
});

test('configureApp registers the plugin, so the app starts with the saved theme', async () => {
  localStorage.clear();
  localStorage.setItem('pinia:settings', JSON.stringify({ theme: 'dark' }));
  const app = createApp(mod.default);
  mod.configureApp(app);
  const host = document.createElement('div');
  document.body.appendChild(host);
  app.mount(host);
  expect(host.textContent).toContain('Theme: dark');
  app.unmount();
});
