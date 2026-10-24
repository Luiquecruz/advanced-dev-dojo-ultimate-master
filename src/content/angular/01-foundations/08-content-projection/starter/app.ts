import { Component, signal } from '@angular/core';
import { Panel } from './panel';

@Component({
  selector: 'app-root',
  imports: [Panel],
  template: `
    <app-panel>
      <h2 panel-title>Notifications</h2>
      <p>You have {{ unread() }} unread messages.</p>
      <button panel-actions (click)="unread.set(0)">Mark all as read</button>
    </app-panel>
    <app-panel>
      <h2 panel-title>Profile</h2>
      <p>Ada Lovelace</p>
    </app-panel>
  `,
})
export class App {
  readonly unread = signal(3);
}
