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
    // TODO: add the /settings record rendering SettingsLayout (default view) and SettingsSidebar ("sidebar" view)
    // TODO: give it children: "" redirects to "settings-profile", "profile" and "account"
  ],
});
