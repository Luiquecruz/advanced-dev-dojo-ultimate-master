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
  if (inject(AuthService).isLoggedIn()) {
    return true;
  }
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const unsavedChangesGuard: CanDeactivateFn<Editor> = (component) =>
  !component.dirty() || window.confirm('Discard unsaved changes?');

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'editor', component: Editor, canDeactivate: [unsavedChangesGuard] },
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
