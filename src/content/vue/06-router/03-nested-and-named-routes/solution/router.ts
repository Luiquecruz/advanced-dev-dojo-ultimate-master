import { createMemoryHistory, createRouter } from 'vue-router';
import HomeView from './HomeView.vue';
import SettingsLayout from './SettingsLayout.vue';
import SettingsSidebar from './SettingsSidebar.vue';
import ProfileSettings from './ProfileSettings.vue';
import AccountSettings from './AccountSettings.vue';

export const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    {
      path: '/settings',
      components: { default: SettingsLayout, sidebar: SettingsSidebar },
      children: [
        { path: '', redirect: { name: 'settings-profile' } },
        { path: 'profile', name: 'settings-profile', component: ProfileSettings },
        { path: 'account', name: 'settings-account', component: AccountSettings },
      ],
    },
  ],
});
