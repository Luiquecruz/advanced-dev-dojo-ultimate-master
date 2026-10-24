import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-profile-card',
  template: `
    <article class="card" [class.online]="isOnline()">
      <img [src]="avatarUrl()" [alt]="name() + ' avatar'" />
      <h2>{{ name() }}</h2>
      <span class="status">{{ isOnline() ? 'Online' : 'Offline' }}</span>
      <div role="progressbar" aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="progress()">
        <div class="bar" [style.width.%]="progress()"></div>
      </div>
    </article>
  `,
})
export class ProfileCard {
  readonly name = signal('Ada Lovelace');
  readonly avatarUrl = signal('/avatars/ada.png');
  readonly isOnline = signal(true);
  readonly progress = signal(40);
}
