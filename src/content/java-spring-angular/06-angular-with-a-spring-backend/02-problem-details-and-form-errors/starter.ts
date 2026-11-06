import { Component, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { form, FormField, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';

export interface FieldProblem {
  field: string;
  message: string;
}

export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: FieldProblem[];
}

export interface Signup {
  name: string;
  email: string;
}

export function isProblemDetail(body: unknown): body is ProblemDetail {
  // TODO: true for an object with a numeric status or a string title, false for everything else (null, strings, other objects)
  return false;
}

@Component({
  selector: 'app-signup',
  imports: [FormField],
  template: `
    <form (submit)="onSubmit($event)" novalidate>
      <label>Name <input [formField]="signupForm.name" /></label>
      @if (signupForm.name().touched()) {
        @for (error of signupForm.name().errors(); track $index) {
          <p class="field-error">{{ error.message }}</p>
        }
      }

      <label>Email <input type="email" [formField]="signupForm.email" /></label>
      @if (signupForm.email().touched()) {
        @for (error of signupForm.email().errors(); track $index) {
          <p class="field-error">{{ error.message }}</p>
        }
      }

      @for (error of signupForm().errors(); track $index) {
        <p role="alert">{{ error.message }}</p>
      }
      <button type="submit">Create account</button>
    </form>
    @if (created()) {
      <p role="status">Welcome, {{ created() }}!</p>
    }
  `,
})
export class SignupForm {
  private readonly http = inject(HttpClient);

  readonly model = signal<Signup>({ name: '', email: '' });
  protected readonly created = signal('');

  readonly signupForm = form(this.model, (path) => {
    required(path.name, { message: 'Name is required' });
    required(path.email, { message: 'Email is required' });
  });

  async onSubmit(event: Event) {
    event.preventDefault();
    // TODO: submit(this.signupForm, async (root) => { ... }) that POSTs this.model() to /api/users.
    //   Success: set created to the name and return undefined.
    //   HttpErrorResponse whose body isProblemDetail:
    //     - errors[] entries for name or email -> { fieldTree: root.<field>, kind: 'server', message } for each
    //     - otherwise one form-level error { kind: 'server', message: detail ?? title }
    //   Any other failure -> form-level error { kind: 'server', message: 'Something went wrong, try again' }
  }
}
