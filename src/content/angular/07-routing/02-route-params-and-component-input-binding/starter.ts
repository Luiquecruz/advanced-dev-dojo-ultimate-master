import { ApplicationConfig, Component, computed, input, numberAttribute, signal } from '@angular/core';
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
      <!-- TODO: one <li> per user with a link to /users/<id> showing the user name -->
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
  // TODO: replace with a required input named "id" that converts the ":id" param with numberAttribute
  readonly id = signal(0);
  // TODO: replace with an optional string input named "tab" (the "?tab=" query param)
  readonly tab = signal<string | undefined>(undefined);
  protected readonly user = computed(() => USERS.find((user) => user.id === this.id()));
}

export const routes: Routes = [
  // TODO: redirect '' to 'users', show UserList at 'users' and UserDetail at 'users/:id'
];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App {}

export const appConfig: ApplicationConfig = {
  // TODO: provide the router with component input binding enabled
  providers: [],
};

export default App;
