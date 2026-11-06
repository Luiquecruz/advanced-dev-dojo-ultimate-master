import { CommonModule } from '@angular/common';
import { Component, Input, NgModule } from '@angular/core';

@Component({
  selector: 'app-badge',
  // TODO: mark as a non-standalone (NgModule-declared) component
  template: `<span class="badge"><ng-content /></span>`,
})
export class BadgeComponent {}

@Component({
  selector: 'app-user-card',
  // TODO: mark as a non-standalone (NgModule-declared) component
  template: `
    <article>
      <h3>{{ name | uppercase }}</h3>
      <app-badge>{{ role }}</app-badge>
    </article>
  `,
})
export class UserCardComponent {
  @Input() name = '';
  @Input() role = '';
}

@NgModule({
  // TODO: declare both components, import CommonModule and export only UserCardComponent
})
export class UsersModule {}

@Component({
  selector: 'app-root',
  // TODO: import UsersModule
  template: `
    <app-user-card name="Ada Lovelace" role="Admin" />
    <app-user-card name="Alan Turing" role="Member" />
  `,
})
export class App {}
