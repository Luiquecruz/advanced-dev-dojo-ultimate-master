import { Component, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { provideHttpClient } from '@angular/common/http';
import { UserService } from './user.service';

@Component({
  selector: 'app-user-card',
  template: `
    @if (user.isLoading()) {
      <p>Loading…</p>
    } @else if (user.error(); as error) {
      <p role="alert">{{ error.message }}</p>
      <button type="button" (click)="user.reload()">Retry</button>
    } @else if (user.hasValue()) {
      <h2>{{ user.value().name }}</h2>
      <p>{{ user.value().email }}</p>
    }
  `,
})
export class UserCard {
  private readonly userService = inject(UserService);

  readonly userId = input.required<number>();

  protected readonly user = rxResource({
    params: () => this.userId(),
    stream: ({ params }) => this.userService.getUser(params),
  });
}

export const appConfig = {
  providers: [provideHttpClient()],
};
