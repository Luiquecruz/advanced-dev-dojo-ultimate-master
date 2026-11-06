import { Component, EventEmitter, Injectable, Input, Output, numberAttribute } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RatingAnalytics {
  readonly events: Array<{ label: string; value: number }> = [];

  track(label: string, value: number) {
    this.events.push({ label, value });
  }
}

@Component({
  selector: 'app-rating',
  template: `
    <p>{{ label }}: {{ value }}/{{ max }}</p>
    @for (star of stars; track star) {
      <button [attr.aria-label]="'Rate ' + star" (click)="rate(star)">{{ star <= value ? '★' : '☆' }}</button>
    }
  `,
})
export class RatingComponent {
  // TODO: @Input() label, @Input() value (numberAttribute transform), @Input() max (default 5)
  label = '';
  value = 0;
  max = 5;

  // TODO: @Output() rated as an EventEmitter<number>

  // TODO: inject RatingAnalytics through the constructor (private readonly analytics)

  get stars(): number[] {
    return Array.from({ length: this.max }, (_, index) => index + 1);
  }

  rate(value: number) {
    // TODO: track the rating with the analytics service and emit it through `rated`
  }
}
