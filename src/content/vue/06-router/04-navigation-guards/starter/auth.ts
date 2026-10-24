import { reactive } from 'vue';

export const auth = reactive({
  user: null as string | null,
  login(name: string) {
    auth.user = name;
  },
  logout() {
    auth.user = null;
  },
});
