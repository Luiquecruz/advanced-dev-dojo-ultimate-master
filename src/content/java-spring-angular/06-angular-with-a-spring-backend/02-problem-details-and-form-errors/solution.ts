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
  if (typeof body !== 'object' || body === null) {
    return false;
  }
  const candidate = body as Record<string, unknown>;
  return typeof candidate['status'] === 'number' || typeof candidate['title'] === 'string';
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
    await submit(this.signupForm, async (root) => {
      try {
        await firstValueFrom(this.http.post('/api/users', this.model()));
        this.created.set(this.model().name);
        return undefined;
      } catch (error) {
        if (!(error instanceof HttpErrorResponse) || !isProblemDetail(error.error)) {
          return { kind: 'server', message: 'Something went wrong, try again' };
        }
        const problem = error.error;
        const fields = { name: root.name, email: root.email } as const;
        const fieldErrors = (problem.errors ?? []).flatMap(({ field, message }) =>
          field in fields ? [{ fieldTree: fields[field as keyof typeof fields], kind: 'server', message }] : [],
        );
        if (fieldErrors.length > 0) {
          return fieldErrors;
        }
        return { kind: 'server', message: problem.detail ?? problem.title ?? 'Something went wrong, try again' };
      }
    });
  }
}
