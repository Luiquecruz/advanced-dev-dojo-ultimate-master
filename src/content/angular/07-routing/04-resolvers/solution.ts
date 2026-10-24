import { ApplicationConfig, Component, inject, input } from '@angular/core';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { RedirectCommand, ResolveFn, Router, RouterOutlet, Routes, provideRouter, withComponentInputBinding } from '@angular/router';
import { catchError, of } from 'rxjs';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

@Component({
  selector: 'app-not-found',
  template: `<h2>User not found</h2>`,
})
export class NotFound {}

export const userResolver: ResolveFn<User> = (route) => {
  const router = inject(Router);
  return inject(HttpClient)
    .get<User>(`/api/users/${route.paramMap.get('id')}`)
    .pipe(catchError(() => of(new RedirectCommand(router.parseUrl('/not-found')))));
};

@Component({
  selector: 'app-user-profile',
  template: `
    <h2>{{ user().name }}</h2>
    <p>{{ user().email }}</p>
  `,
})
export class UserProfile {
  readonly user = input.required<User>();
}

export const routes: Routes = [
  { path: 'users/:id', component: UserProfile, resolve: { user: userResolver } },
  { path: 'not-found', component: NotFound },
];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App {}

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes, withComponentInputBinding()), provideHttpClient()],
};

export default App;
