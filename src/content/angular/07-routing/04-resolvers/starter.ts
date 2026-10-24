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
  // TODO: GET /api/users/<id> with HttpClient, using the ":id" param from route.paramMap
  // TODO: on error, emit a RedirectCommand to /not-found instead of failing the navigation
  return of({ id: 0, name: 'TODO', email: '', role: '' });
};

@Component({
  selector: 'app-user-profile',
  template: `
    <!-- TODO: render the user name in an <h2> and the email in a <p> -->
  `,
})
export class UserProfile {
  // TODO: receive the resolved "user" as a required signal input
}

export const routes: Routes = [
  // TODO: attach userResolver under the "user" key
  { path: 'users/:id', component: UserProfile },
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
