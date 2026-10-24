import { Component, Directive, computed, input, signal } from '@angular/core';

@Directive({
  selector: '[appHighlight]',
  // TODO: host bindings for style.backgroundColor and mouseenter/mouseleave listeners
})
export class Highlight {
  // TODO: input aliased 'appHighlight', fallback to 'yellow', and a hovered signal
}

@Component({
  selector: 'app-card',
  // TODO: hostDirectives exposing appHighlight as highlightColor
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
