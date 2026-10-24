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
      <!-- TODO: when the email field is touched, render each error message in a <p> -->

      <label>Password <input type="password" [formField]="signupForm.password" /></label>
      <!-- TODO: same for password -->

      <label>Confirm password <input type="password" [formField]="signupForm.confirmPassword" /></label>
      <!-- TODO: same for confirmPassword -->

      <!-- TODO: disable while the root field is submitting -->
      <button type="submit">Create account</button>
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
    // TODO: email -> required ("Email is required") and email ("Enter a valid email")
    // TODO: password -> required ("Password is required") and minLength 8 ("Password must be at least 8 characters")
    // TODO: confirmPassword -> validate(): { kind: 'mismatch', message: 'Passwords do not match' } when it differs from password
  });

  async onSubmit(event: Event) {
    event.preventDefault();
    // TODO: call submit(this.signupForm, async (field) => ...):
    //   GET /api/users; if the email is taken return { fieldTree: field.email, kind: 'server', message: 'Email already registered' }
    //   otherwise set registered to the email and return undefined
  }
}
