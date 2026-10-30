import { AccountPage } from './AccountPage';

export function register(shell) {
  shell.addPage({ path: '/account', title: 'Account', Component: AccountPage });
}
