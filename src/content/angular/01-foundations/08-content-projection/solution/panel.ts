import { Component } from '@angular/core';

@Component({
  selector: 'app-panel',
  template: `
    <section class="panel">
      <header class="panel-header"><ng-content select="[panel-title]" /></header>
      <div class="panel-body"><ng-content /></div>
      <footer class="panel-footer"><ng-content select="[panel-actions]">No actions</ng-content></footer>
    </section>
  `,
})
export class Panel {}
