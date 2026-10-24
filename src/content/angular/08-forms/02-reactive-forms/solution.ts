import { Component, inject, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

export interface Credentials {
  email: string;
  password: string;
  remember: boolean;
}

@Component({
  selector: 'app-login-form',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <label>Email <input type="email" formControlName="email" /></label>
      @if (form.controls.email.touched && form.controls.email.hasError('required')) {
        <p class="error">Email is required</p>
      }
      @if (form.controls.email.touched && form.controls.email.hasError('email')) {
        <p class="error">Enter a valid email</p>
      }

      <label>Password <input type="password" formControlName="password" /></label>
      @if (form.controls.password.touched && form.controls.password.hasError('minlength')) {
        <p class="error">Password must be at least 8 characters</p>
      }

      <label><input type="checkbox" formControlName="remember" /> Remember me</label>

      <button type="button" (click)="useDemoAccount()">Use demo account</button>
      <button type="submit" [disabled]="form.invalid">Log in</button>
    </form>
  `,
})
export class LoginForm {
  private readonly formBuilder = inject(FormBuilder);

  readonly loggedIn = output<Credentials>();

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    remember: [false],
  });

  useDemoAccount() {
    this.form.patchValue({ email: 'demo@example.com', password: 'demo-password' });
  }

  submit() {
    if (this.form.valid) {
      this.loggedIn.emit(this.form.getRawValue());
    }
  }
}
