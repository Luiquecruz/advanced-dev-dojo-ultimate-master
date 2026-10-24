import { Component, effect, signal, untracked } from '@angular/core';

@Component({
  selector: 'app-auto-save',
  template: `
    <input aria-label="Draft" [value]="draft()" (input)="draft.set($any($event.target).value)" />
    <p class="author">Author: {{ author() }}</p>
    <ul>
      @for (entry of saved(); track $index) {
        <li>{{ entry }}</li>
      }
    </ul>
  `,
})
export class AutoSave {
  readonly draft = signal('');
  readonly author = signal('Ada');
  readonly saved = signal<string[]>([]);
  readonly delayMs = 150;

  constructor() {
    // TODO: debounced auto-save effect with untracked(author) and onCleanup
  }
}
