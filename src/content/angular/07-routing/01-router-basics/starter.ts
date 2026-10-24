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
  // TODO: '' -> Home (title "Home"), 'about' -> About (title "About")
  // TODO: redirect 'home' to '' and send every unknown path ('**') to NotFound
];

@Component({
  selector: 'app-root',
  // TODO: import RouterOutlet, RouterLink and RouterLinkActive
  imports: [],
  template: `
    <nav>
      <!-- TODO: "Home" link to / and "About" link to /about, both with routerLinkActive="active" -->
    </nav>
    <main>
      <!-- TODO: add the router outlet -->
    </main>
  `,
})
export class App {}

export const appConfig: ApplicationConfig = {
  // TODO: register the router with provideRouter(routes)
  providers: [],
};

export default App;
