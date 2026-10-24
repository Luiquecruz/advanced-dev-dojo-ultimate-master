import { Component, Directive, TemplateRef, ViewContainerRef, effect, inject, input, signal } from '@angular/core';

@Directive({ selector: '[appUnless]' })
export class Unless {
  readonly appUnless = input.required<boolean>();
  private readonly template = inject(TemplateRef);
  private readonly container = inject(ViewContainerRef);

  constructor() {
    effect(() => {
      const hidden = this.appUnless();
      if (!hidden && this.container.length === 0) {
        this.container.createEmbeddedView(this.template);
      } else if (hidden) {
        this.container.clear();
      }
    });
  }
}

export interface TimesContext {
  $implicit: number;
  count: number;
}

@Directive({ selector: '[appTimes]' })
export class Times {
  readonly appTimes = input.required<number>();
  private readonly template = inject<TemplateRef<TimesContext>>(TemplateRef);
  private readonly container = inject(ViewContainerRef);

  static ngTemplateContextGuard(directive: Times, context: unknown): context is TimesContext {
    return true;
  }

  constructor() {
    effect(() => {
      const count = this.appTimes();
      this.container.clear();
      for (let index = 0; index < count; index++) {
        this.container.createEmbeddedView(this.template, { $implicit: index, count });
      }
    });
  }
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
