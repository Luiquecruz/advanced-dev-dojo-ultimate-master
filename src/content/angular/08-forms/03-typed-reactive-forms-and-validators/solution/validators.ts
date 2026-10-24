import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function forbiddenNameValidator(forbidden: string[]): ValidatorFn {
  const blocked = forbidden.map((name) => name.toLowerCase());
  return (control: AbstractControl<string>): ValidationErrors | null =>
    blocked.includes(control.value.trim().toLowerCase()) ? { forbiddenName: { value: control.value } } : null;
}

export const passwordsMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordsMismatch: true };
};
