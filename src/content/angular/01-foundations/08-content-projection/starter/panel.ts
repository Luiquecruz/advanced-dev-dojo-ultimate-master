import { Component } from '@angular/core';

@Component({
  selector: 'app-panel',
  template: `
    <section class="panel">
      <!-- TODO: project [panel-title] -->
      <header class="panel-header"></header>
      <!-- TODO: project the default content -->
      <div class="panel-body"></div>
      <!-- TODO: project [panel-actions] with "No actions" as fallback -->
      <footer class="panel-footer"></footer>
    </section>
  `,
})
export class Panel {}
