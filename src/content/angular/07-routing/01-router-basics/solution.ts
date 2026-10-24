import { ApplicationConfig, Component } from '@angular/core';
import { provideRouter, RouterLink, RouterLinkActive, RouterOutlet, Routes } from '@angular/router';

@Component({
  selector: 'app-home',
  template: `<h2>Welcome home</h2>`,
})
export class Home {}

@Component({
  selector: 'app-about',
  template: `<h2>About us</h2>`,
})
export class About {}

@Component({
  selector: 'app-not-found',
  template: `<h2>Page not found</h2>`,
})
export class NotFound {}

export const routes: Routes = [
  { path: '', component: Home, title: 'Home' },
  { path: 'about', component: About, title: 'About' },
  { path: 'home', redirectTo: '', pathMatch: 'full' },
  { path: '**', component: NotFound, title: 'Not found' },
];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav>
      <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Home</a>
      <a routerLink="/about" routerLinkActive="active">About</a>
    </nav>
    <main>
      <router-outlet />
    </main>
  `,
})
export class App {}

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes)],
};

export default App;
