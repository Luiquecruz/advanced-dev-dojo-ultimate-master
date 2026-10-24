import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { email, form, FormField, minLength, required, submit, validate } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';

export interface Signup {
  email: string;
  password: string;
  confirmPassword: string;
}

@Component({
  selector: 'app-signup',
  imports: [FormField],
  template: `
    <form (submit)="onSubmit($event)" novalidate>
      <label>Email <input type="email" [formField]="signupForm.email" /></label>
      @if (signupForm.email().touched()) {
        @for (error of signupForm.email().errors(); track error.kind) {
          <p class="error">{{ error.message }}</p>
        }
      }

      <label>Password <input type="password" [formField]="signupForm.password" /></label>
      @if (signupForm.password().touched()) {
        @for (error of signupForm.password().errors(); track error.kind) {
          <p class="error">{{ error.message }}</p>
        }
      }

      <label>Confirm password <input type="password" [formField]="signupForm.confirmPassword" /></label>
      @if (signupForm.confirmPassword().touched()) {
        @for (error of signupForm.confirmPassword().errors(); track error.kind) {
          <p class="error">{{ error.message }}</p>
        }
      }

      <button type="submit" [disabled]="signupForm().submitting()">Create account</button>
    </form>
    @if (registered()) {
      <p role="status">Welcome, {{ registered() }}!</p>
    }
  `,
})
export class SignupForm {
  private readonly http = inject(HttpClient);

  readonly model = signal<Signup>({ email: '', password: '', confirmPassword: '' });
  protected readonly registered = signal('');

  readonly signupForm = form(this.model, (path) => {
    required(path.email, { message: 'Email is required' });
    email(path.email, { message: 'Enter a valid email' });
    required(path.password, { message: 'Password is required' });
    minLength(path.password, 8, { message: 'Password must be at least 8 characters' });
    validate(path.confirmPassword, ({ value, valueOf }) =>
      value() === valueOf(path.password) ? undefined : { kind: 'mismatch', message: 'Passwords do not match' },
    );
  });

  async onSubmit(event: Event) {
    event.preventDefault();
    await submit(this.signupForm, async (field) => {
      const users = await firstValueFrom(this.http.get<Array<{ email: string }>>('/api/users'));
      if (users.some((user) => user.email === field.email().value())) {
        return { fieldTree: field.email, kind: 'server', message: 'Email already registered' };
      }
      this.registered.set(field.email().value());
      return undefined;
    });
  }
}
