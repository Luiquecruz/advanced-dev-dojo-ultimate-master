import { ApplicationConfig, Component, inject } from '@angular/core';
import { CurrentUser, provideSession } from './session';

export const appConfig: ApplicationConfig = {
  // TODO: register provideSession(3)
  providers: [],
};

@Component({
  selector: 'app-welcome',
  template: `
    <!-- TODO: <p>Welcome, {{ ... }}</p> -->
  `,
})
export class Welcome {
  // TODO: inject CurrentUser
}
