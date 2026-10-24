import { Component, inject } from '@angular/core';
import { GREETING, Logger, MemoryLogger } from './tokens';

@Component({
  selector: 'app-greeter',
  providers: [{ provide: Logger, useClass: MemoryLogger }],
  template: `
    <h1>{{ greeting }}, Ada!</h1>
    <button (click)="greet()">Greet</button>
  `,
})
export class Greeter {
  protected readonly greeting = inject(GREETING);
  private readonly logger = inject(Logger);

  greet() {
    this.logger.log('Greeted Ada');
  }
}
