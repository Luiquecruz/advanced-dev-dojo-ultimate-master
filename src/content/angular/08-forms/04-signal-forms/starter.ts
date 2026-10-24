import { Component, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';

export interface Profile {
  name: string;
  age: number;
  address: { city: string };
  newsletter: boolean;
}

export const EMPTY_PROFILE: Profile = { name: '', age: 0, address: { city: '' }, newsletter: false };

@Component({
  selector: 'app-profile-editor',
  // TODO: import the FormField directive
  imports: [],
  template: `
    <!-- TODO: bind each input with [formField] to profileForm.name, .age, .address.city and .newsletter -->
    <label>Name <input /></label>
    <label>Age <input type="number" /></label>
    <label>City <input /></label>
    <label><input type="checkbox" /> Newsletter</label>

    <p>Hello, {{ model().name || 'stranger' }}</p>
    @if (model().newsletter) {
      <p>Sending news to {{ model().address.city }}</p>
    }
    <!-- TODO: show "Unsaved changes" when the root field is dirty, otherwise "No changes" -->

    <button type="button" (click)="loadSample()">Load sample</button>
    <button type="button" (click)="reset()">Reset</button>
  `,
})
export class ProfileEditor {
  readonly model = signal<Profile>(EMPTY_PROFILE);
  // TODO: create the field tree with form(this.model)
  protected readonly profileForm = null;

  loadSample() {
    // TODO: set the model to Grace Hopper, 85, Arlington, newsletter true
  }

  reset() {
    // TODO: reset the root field state back to EMPTY_PROFILE
  }
}
