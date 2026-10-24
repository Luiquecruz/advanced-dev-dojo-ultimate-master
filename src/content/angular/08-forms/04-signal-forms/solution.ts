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
  imports: [FormField],
  template: `
    <label>Name <input [formField]="profileForm.name" /></label>
    <label>Age <input type="number" [formField]="profileForm.age" /></label>
    <label>City <input [formField]="profileForm.address.city" /></label>
    <label><input type="checkbox" [formField]="profileForm.newsletter" /> Newsletter</label>

    <p>Hello, {{ model().name || 'stranger' }}</p>
    @if (model().newsletter) {
      <p>Sending news to {{ model().address.city }}</p>
    }
    <p>{{ profileForm().dirty() ? 'Unsaved changes' : 'No changes' }}</p>

    <button type="button" (click)="loadSample()">Load sample</button>
    <button type="button" (click)="reset()">Reset</button>
  `,
})
export class ProfileEditor {
  readonly model = signal<Profile>(EMPTY_PROFILE);
  protected readonly profileForm = form(this.model);

  loadSample() {
    this.model.set({ name: 'Grace Hopper', age: 85, address: { city: 'Arlington' }, newsletter: true });
  }

  reset() {
    this.profileForm().reset(EMPTY_PROFILE);
  }
}
