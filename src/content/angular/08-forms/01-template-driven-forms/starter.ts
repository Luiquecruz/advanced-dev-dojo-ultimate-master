import { Component, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

@Component({
  selector: 'app-newsletter',
  // TODO: import FormsModule
  imports: [],
  template: `
    <!-- TODO: export the form as #signupForm="ngForm" and call subscribe(signupForm) on (ngSubmit) -->
    <form>
      <label>
        Name
        <!-- TODO: name="name", two-way bind to name with ngModel, required, minlength="2", export as #nameModel="ngModel" -->
        <input />
      </label>
      <!-- TODO: show "Name must be at least 2 characters" when nameModel is invalid and touched -->
      <label>
        Email
        <!-- TODO: name="email", two-way bind to email with ngModel, required and email validators -->
        <input type="email" />
      </label>
      <!-- TODO: disable while the form is invalid -->
      <button type="submit">Subscribe</button>
    </form>
    @if (subscribed()) {
      <p role="status">Thanks, {{ subscribed() }}!</p>
    }
  `,
})
export class Newsletter {
  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly subscribed = signal('');

  subscribe(form: NgForm) {
    // TODO: store the submitted name in subscribed and reset the form with form.resetForm()
  }
}
