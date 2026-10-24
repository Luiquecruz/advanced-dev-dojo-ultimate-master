import { Component, input, output } from '@angular/core';
import { outputFromObservable } from '@angular/core/rxjs-interop';
import { Subject, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-star-rating',
  template: `
    @for (star of stars; track star) {
      <button [attr.aria-label]="'Rate ' + star" (click)="rate(star)" (mouseenter)="hover$.next(star)">
        {{ star <= value() ? '★' : '☆' }}
      </button>
    }
    <button (click)="clear()">Clear</button>
  `,
})
export class StarRating {
  readonly value = input(0);
  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly hover$ = new Subject<number>();

  readonly rated = output<number>();
  readonly cleared = output<void>();
  readonly previewed = outputFromObservable(this.hover$.pipe(distinctUntilChanged()));

  rate(star: number) {
    this.rated.emit(star);
  }

  clear() {
    this.cleared.emit();
  }
}
