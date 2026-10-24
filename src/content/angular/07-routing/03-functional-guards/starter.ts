import { ApplicationConfig, Component, inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute, CanActivateFn, CanDeactivateFn, provideRouter, Router, RouterOutlet, Routes } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly isLoggedIn = signal(false);

  login() {
    this.isLoggedIn.set(true);
  }
}

@Component({
  selector: 'app-login',
  template: `
    <h2>Login</h2>
    <button (click)="login()">Log in</button>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  login() {
    this.auth.login();
    this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard');
  }
}

@Component({
  selector: 'app-dashboard',
  template: `<h2>Dashboard</h2>`,
})
export class Dashboard {}

@Component({
  selector: 'app-editor',
  template: `
    <h2>Editor</h2>
    <label>Draft <input (input)="dirty.set(true)" /></label>
  `,
})
export class Editor {
  readonly dirty = signal(false);
}

export const authGuard: CanActivateFn = (route, state) => {
  // TODO: allow when AuthService.isLoggedIn() is true
  // TODO: otherwise return a UrlTree to /login with the returnUrl query param set to state.url
  return true;
};

export const unsavedChangesGuard: CanDeactivateFn<Editor> = (component) => {
  // TODO: allow leaving when the editor is not dirty, otherwise ask window.confirm('Discard unsaved changes?')
  return true;
};

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'login', component: Login },
  // TODO: protect "dashboard" with authGuard
  { path: 'dashboard', component: Dashboard },
  // TODO: protect leaving "editor" with unsavedChangesGuard
  { path: 'editor', component: Editor },
];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App {}

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes)],
};

export default App;
