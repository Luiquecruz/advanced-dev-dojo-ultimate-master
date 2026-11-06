import { Component, inject } from '@angular/core';
import { PreferencesStore } from './preferences.store';

@Component({
  selector: 'app-preferences',
  template: `
    <p>Theme: {{ store.theme() }}</p>
    <p>Font size: {{ store.fontSize() }}px</p>
    <button (click)="store.toggleTheme()">Toggle theme</button>
    <button (click)="store.increaseFont()">A+</button>
    <button (click)="store.decreaseFont()">A-</button>
    <button (click)="store.reset()">Reset</button>
  `,
})
export class PreferencesPanel {
  protected readonly store = inject(PreferencesStore);
}
