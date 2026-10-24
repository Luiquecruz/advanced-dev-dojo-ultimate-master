`ngModel` needs a `name` attribute inside a `<form>`: that name becomes the control key in `signupForm.value`. Without it Angular throws an error.
---
Validation attributes (`required`, `minlength="2"`, `email`) are directives from `FormsModule`. A template reference variable gives you the control: `#nameModel="ngModel"` → `nameModel.invalid`, `nameModel.touched`.
---
`[(ngModel)]` works with writable signals: `[(ngModel)]="name"` reads `name()` and calls `name.set()` on input.
---
`<form #signupForm="ngForm" (ngSubmit)="subscribe(signupForm)">` and `<button type="submit" [disabled]="signupForm.invalid">`. In `subscribe`, call `this.subscribed.set(this.name())` before `form.resetForm()`.
