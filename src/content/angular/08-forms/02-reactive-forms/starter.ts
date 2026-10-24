import { Component, inject, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

export interface Credentials {
  email: string;
  password: string;
  remember: boolean;
}

@Component({
  selector: 'app-login-form',
  // TODO: import ReactiveFormsModule
  imports: [],
  template: `
    <!-- TODO: bind [formGroup]="form" and call submit() on (ngSubmit) -->
    <form>
      <!-- TODO: connect each input with formControlName -->
      <label>Email <input type="email" /></label>
      <!-- TODO: "Email is required" / "Enter a valid email" when the email control is touched and has that error -->

      <label>Password <input type="password" /></label>
      <!-- TODO: "Password must be at least 8 characters" when touched and minlength fails -->

      <label><input type="checkbox" /> Remember me</label>

      <button type="button" (click)="useDemoAccount()">Use demo account</button>
      <!-- TODO: disable while the form is invalid -->
      <button type="submit">Log in</button>
    </form>
  `,
})
export class LoginForm {
  private readonly formBuilder = inject(FormBuilder);

  readonly loggedIn = output<Credentials>();

  // TODO: build the group with formBuilder.nonNullable.group():
  //   email: '' (required, email), password: '' (required, minLength 8), remember: false
  protected readonly form = this.formBuilder.nonNullable.group({});

  useDemoAccount() {
    // TODO: patch email "demo@example.com" and password "demo-password"
  }

  submit() {
    // TODO: when the form is valid, emit loggedIn with form.getRawValue()
  }
}
