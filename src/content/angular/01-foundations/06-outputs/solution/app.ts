import { Component, signal } from '@angular/core';
import { StarRating } from './rating';

@Component({
  selector: 'app-root',
  imports: [StarRating],
  template: `
    <app-star-rating
      [value]="rating()"
      (rated)="rating.set($event)"
      (cleared)="rating.set(0)"
      (previewed)="preview.set($event)"
    />
    <p class="summary">
      @if (rating() > 0) { You rated {{ rating() }}/5 } @else { Not rated yet }
    </p>
    <p class="preview">Preview: {{ preview() }}</p>
  `,
})
export class App {
  readonly rating = signal(0);
  readonly preview = signal(0);
}
