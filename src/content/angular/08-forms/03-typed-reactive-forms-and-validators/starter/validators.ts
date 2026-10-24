import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function forbiddenNameValidator(forbidden: string[]): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    // TODO: return { forbiddenName: { value: control.value } } when the trimmed value matches a forbidden name (case-insensitive)
    return null;
  };
}

export const passwordsMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  // TODO: compare the "password" and "confirmPassword" children and return { passwordsMismatch: true } when they differ
  return null;
};
