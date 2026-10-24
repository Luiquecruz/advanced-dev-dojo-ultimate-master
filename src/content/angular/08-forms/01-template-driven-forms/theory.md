## Template-driven forms

Angular ships three form APIs:

| API | Where the model lives | Since |
| --- | --- | --- |
| Template-driven (`FormsModule`) | Directives in the template | Angular 2 |
| Reactive (`ReactiveFormsModule`) | `FormGroup`/`FormControl` objects in the class | Angular 2 |
| Signal Forms (`@angular/forms/signals`) | A signal you own, wrapped by `form()` | Angular 21+ |

Template-driven forms are the closest to plain HTML: you add `ngModel` to inputs and Angular builds the controls behind the scenes.

### Binding values

```ts
@Component({
  imports: [FormsModule],
  template: `
    <form #signupForm="ngForm" (ngSubmit)="save(signupForm)">
      <input name="email" [(ngModel)]="email" required email />
      <button [disabled]="signupForm.invalid">Save</button>
    </form>
  `,
})
export class Signup {
  protected readonly email = signal('');

  save(form: NgForm) {
    console.log(form.value); // { email: '...' }
  }
}
```

- `FormsModule` attaches `NgForm` to every `<form>` automatically. `#signupForm="ngForm"` gives the template a reference to it.
- `[(ngModel)]` is two-way binding: "banana in a box" `[()]`. It works with plain properties and with **writable signals**.
- Inside a form, each `ngModel` needs a **`name`**: it becomes the key in `form.value`.
- `(ngSubmit)` fires on submit and sets `form.submitted`. The browser's default page reload is prevented.

### Validation

HTML-like attributes are Angular validator directives: `required`, `minlength`, `maxlength`, `pattern`, `email`, `min`, `max`. Export a control to read its state:

```html
<input name="name" [(ngModel)]="name" required minlength="2" #nameModel="ngModel" />
@if (nameModel.invalid && nameModel.touched) {
  <p>Name must be at least 2 characters</p>
}
```

Each control exposes `valid`/`invalid`, `errors` (e.g. `{ minlength: { requiredLength: 2, actualLength: 1 } }`), `touched` (blurred once), `dirty` (changed by the user) and `pristine`. Angular also adds CSS classes such as `ng-invalid`, `ng-touched` and `ng-dirty` to the element.

Show errors after `touched` (or after submit), never while the user is still typing for the first time.

### Resetting

`form.resetForm()` clears every value **and** resets `touched`, `dirty` and `submitted`. Assigning empty values manually leaves the form dirty and touched, so errors suddenly appear.

### Trade-offs

Template-driven forms are quick for small forms, but:

- the model is assembled **asynchronously** by directives, so the controls do not exist yet in the constructor;
- validation logic is scattered across the template and hard to unit test;
- dynamic fields and cross-field validation get awkward.

That is why larger apps used **reactive forms**, and why new code can use **Signal Forms**: a typed model you own, with validation declared in TypeScript. You will build both next.
