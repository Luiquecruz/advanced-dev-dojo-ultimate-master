import { Component, inject } from '@angular/core';
import { FormArray, FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forbiddenNameValidator, passwordsMatchValidator } from './validators';

export type SignupForm = FormGroup<{
  username: FormControl<string>;
  password: FormControl<string>;
  confirmPassword: FormControl<string>;
  skills: FormArray<FormControl<string>>;
}>;

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form">
      <label>Username <input formControlName="username" /></label>
      @if (form.controls.username.hasError('forbiddenName')) {
        <p class="error">This username is reserved</p>
      }

      <label>Password <input type="password" formControlName="password" /></label>
      <label>Confirm password <input type="password" formControlName="confirmPassword" /></label>
      <!-- TODO: show "Passwords do not match" when the GROUP has the passwordsMismatch error and confirmPassword is dirty -->

      <fieldset formArrayName="skills">
        <legend>Skills ({{ form.controls.skills.length }})</legend>
        <!-- TODO: one input per skill control: [formControlName]="index" and aria-label "Skill 1", "Skill 2"... -->
        <button type="button" (click)="addSkill()">Add skill</button>
      </fieldset>

      <button type="submit" [disabled]="form.invalid">Sign up</button>
    </form>
  `,
})
export class Signup {
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly form: SignupForm = this.formBuilder.group({
    // TODO: add forbiddenNameValidator(['admin', 'root']) to username
    username: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
    skills: this.formBuilder.array<FormControl<string>>([]),
  });
  // TODO: pass { validators: passwordsMatchValidator } as the second argument of group()

  addSkill() {
    // TODO: push a new required control with an empty string into the skills FormArray
  }
}
