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
  @Input() label = '';
  @Input({ transform: numberAttribute }) value = 0;
  @Input() max = 5;
  @Output() rated = new EventEmitter<number>();

  constructor(private readonly analytics: RatingAnalytics) {}

  get stars(): number[] {
    return Array.from({ length: this.max }, (_, index) => index + 1);
  }

  rate(value: number) {
    this.analytics.track(this.label, value);
    this.rated.emit(value);
  }
}
