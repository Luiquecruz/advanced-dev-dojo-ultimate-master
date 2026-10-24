import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-chat-composer',
  template: `
    <input
      aria-label="Message"
      [value]="draft()"
      (input)="updateDraft($event)"
      (keydown.enter)="send()"
      (keydown.escape)="clear()"
    />
    <button [disabled]="!draft().trim()" (click)="send()">Send</button>
    <p class="count">{{ draft().length }}/140</p>
    <ul>
      @for (message of messages(); track $index) {
        <li>{{ message }}</li>
      }
    </ul>
  `,
})
export class ChatComposer {
  readonly draft = signal('');
  readonly messages = signal<string[]>([]);

  updateDraft(event: Event) {
    this.draft.set((event.target as HTMLInputElement).value);
  }

  send() {
    const text = this.draft().trim();
    if (!text) {
      return;
    }
    this.messages.update((messages) => [...messages, text]);
    this.draft.set('');
  }

  clear() {
    this.draft.set('');
  }
}
