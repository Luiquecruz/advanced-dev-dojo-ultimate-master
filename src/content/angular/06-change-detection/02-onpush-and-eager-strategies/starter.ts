import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section><p class="percentage">{{ progress() }}%</p><p class="status">{{ status() }}</p><button (click)="reset()">Reset</button></section>`,
})
export class ProgressCard {
  readonly progress = signal(0);
  readonly status = computed(() => this.progress() === 0 ? 'Waiting' : this.progress() === 100 ? 'Complete' : 'Running');
  receiveProgress(value: number) {
    // Accept a finite external update and notify the view.
  }
  reset() {
    // Reset the job progress.
  }
}
