import { Component, Directive, computed, input, signal } from '@angular/core';

@Directive({
  selector: '[appHighlight]',
  host: {
    '[style.backgroundColor]': 'hovered() ? color() : null',
    '(mouseenter)': 'hovered.set(true)',
    '(mouseleave)': 'hovered.set(false)',
  },
})
export class Highlight {
  readonly appHighlight = input('');
  protected readonly color = computed(() => this.appHighlight() || 'yellow');
  protected readonly hovered = signal(false);
}

@Component({
  selector: 'app-card',
  hostDirectives: [{ directive: Highlight, inputs: ['appHighlight: highlightColor'] }],
  template: `<ng-content />`,
})
export class Card {}

@Component({
  selector: 'app-root',
  imports: [Highlight, Card],
  template: `
    <p appHighlight="orange">Orange paragraph</p>
    <p appHighlight>Default paragraph</p>
    <app-card highlightColor="pink">Pink card</app-card>
  `,
})
export class App {}
