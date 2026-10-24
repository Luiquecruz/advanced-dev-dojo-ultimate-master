import { ApplicationConfig, Component, inject } from '@angular/core';
import { CurrentUser, provideSession } from './session';

export const appConfig: ApplicationConfig = {
  providers: [provideSession(3)],
};

@Component({
  selector: 'app-welcome',
  template: `<p>Welcome, {{ session.user()?.name }}</p>`,
})
export class Welcome {
  protected readonly session = inject(CurrentUser);
}
