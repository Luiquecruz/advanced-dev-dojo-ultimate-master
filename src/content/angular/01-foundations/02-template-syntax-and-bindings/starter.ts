import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-profile-card',
  template: `
    <!-- TODO: add a class binding for "online" -->
    <article class="card">
      <!-- TODO: bind src and alt -->
      <img />
      <!-- TODO: interpolate the name -->
      <h2></h2>
      <!-- TODO: render Online / Offline -->
      <span class="status"></span>
      <!-- TODO: bind aria-valuenow -->
      <div role="progressbar" aria-valuemin="0" aria-valuemax="100">
        <!-- TODO: bind the width style in % -->
        <div class="bar"></div>
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
