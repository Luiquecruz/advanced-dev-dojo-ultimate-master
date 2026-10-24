import { Component, Directive, TemplateRef, ViewContainerRef, effect, inject, input, signal } from '@angular/core';

@Directive({ selector: '[appUnless]' })
export class Unless {
  // TODO: input appUnless, inject TemplateRef and ViewContainerRef, render in an effect
}

export interface TimesContext {
  $implicit: number;
  count: number;
}

@Directive({ selector: '[appTimes]' })
export class Times {
  // TODO: input appTimes, render the template N times with { $implicit: index, count }
}

@Component({
  selector: 'app-root',
  imports: [Unless, Times],
  template: `
    <button (click)="toggle()">Toggle</button>
    <p *appUnless="hidden()">Now you see me</p>
    <button (click)="more()">More</button>
    <ul>
      <li *appTimes="total(); let i; let count = count">Item {{ i + 1 }} of {{ count }}</li>
    </ul>
  `,
})
export class App {
  protected readonly hidden = signal(false);
  protected readonly total = signal(3);

  toggle() {
    this.hidden.update((value) => !value);
  }

  more() {
    this.total.update((value) => value + 1);
  }
}
