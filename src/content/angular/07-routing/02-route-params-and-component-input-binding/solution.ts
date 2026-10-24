import { ApplicationConfig, Component, computed, input, numberAttribute } from '@angular/core';
import { provideRouter, RouterLink, RouterOutlet, Routes, withComponentInputBinding } from '@angular/router';

export interface User {
  id: number;
  name: string;
  role: string;
}

export const USERS: User[] = [
  { id: 1, name: 'Ada Lovelace', role: 'admin' },
  { id: 2, name: 'Alan Turing', role: 'editor' },
  { id: 3, name: 'Grace Hopper', role: 'viewer' },
  { id: 4, name: 'Linus Torvalds', role: 'editor' },
  { id: 5, name: 'Margaret Hamilton', role: 'admin' },
];

@Component({
  selector: 'app-user-list',
  imports: [RouterLink],
  template: `
    <h2>Users</h2>
    <ul>
      @for (user of users; track user.id) {
        <li><a [routerLink]="['/users', user.id]">{{ user.name }}</a></li>
      }
    </ul>
  `,
})
export class UserList {
  protected readonly users = USERS;
}

@Component({
  selector: 'app-user-detail',
  imports: [RouterLink],
  template: `
    @if (user(); as user) {
      <h2>{{ user.name }}</h2>
      <p>Role: {{ user.role }}</p>
    } @else {
      <p>User not found</p>
    }
    <p>Active tab: {{ tab() ?? 'profile' }}</p>
    <a [routerLink]="['/users', id() + 1]">Next user</a>
  `,
})
export class UserDetail {
  readonly id = input.required({ transform: numberAttribute });
  readonly tab = input<string>();
  protected readonly user = computed(() => USERS.find((user) => user.id === this.id()));
}

export const routes: Routes = [
  { path: '', redirectTo: 'users', pathMatch: 'full' },
  { path: 'users', component: UserList },
  { path: 'users/:id', component: UserDetail },
];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App {}

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes, withComponentInputBinding())],
};

export default App;
