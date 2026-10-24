import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-chat-composer',
  template: `
    <!-- TODO: listen to (input), (keydown.enter) and (keydown.escape) -->
    <input aria-label="Message" [value]="draft()" />
    <!-- TODO: call send() on click -->
    <button [disabled]="!draft().trim()">Send</button>
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
    // TODO: store the input value in draft
  }

  send() {
    // TODO: append the trimmed draft to messages and reset the draft
  }

  clear() {
    // TODO: reset the draft
  }
}
