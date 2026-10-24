import { Component, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

@Component({
  selector: 'app-newsletter',
  imports: [FormsModule],
  template: `
    <form #signupForm="ngForm" (ngSubmit)="subscribe(signupForm)">
      <label>
        Name
        <input name="name" [(ngModel)]="name" required minlength="2" #nameModel="ngModel" />
      </label>
      @if (nameModel.invalid && nameModel.touched) {
        <p class="error">Name must be at least 2 characters</p>
      }
      <label>
        Email
        <input type="email" name="email" [(ngModel)]="email" required email />
      </label>
      <button type="submit" [disabled]="signupForm.invalid">Subscribe</button>
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
    this.subscribed.set(this.name());
    form.resetForm();
  }
}
