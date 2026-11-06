import { CommonModule } from '@angular/common';
import { Component, Input, NgModule } from '@angular/core';

@Component({
  selector: 'app-badge',
  standalone: false,
  template: `<span class="badge"><ng-content /></span>`,
})
export class BadgeComponent {}

@Component({
  selector: 'app-user-card',
  standalone: false,
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
  declarations: [BadgeComponent, UserCardComponent],
  imports: [CommonModule],
  exports: [UserCardComponent],
})
export class UsersModule {}

@Component({
  selector: 'app-root',
  imports: [UsersModule],
  template: `
    <app-user-card name="Ada Lovelace" role="Admin" />
    <app-user-card name="Alan Turing" role="Member" />
  `,
})
export class App {}
