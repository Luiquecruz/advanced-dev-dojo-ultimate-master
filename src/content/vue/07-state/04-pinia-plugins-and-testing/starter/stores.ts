import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSettingsStore = defineStore('settings', {
  state: () => ({ theme: 'light' as 'light' | 'dark', fontSize: 16 }),
  actions: {
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light';
    },
  },
  persist: true,
});

export const useRecentStore = defineStore(
  'recent',
  () => {
    const searches = ref<string[]>([]);
    function remember(query: string) {
      searches.value.unshift(query);
    }
    return { searches, remember };
  },
  { persist: true },
);

export const useDraftStore = defineStore('draft', {
  state: () => ({ text: '' }),
});
