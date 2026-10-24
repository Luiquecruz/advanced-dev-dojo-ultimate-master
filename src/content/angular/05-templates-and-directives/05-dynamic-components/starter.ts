import { Component, ComponentRef, Type, ViewContainerRef, input, inputBinding, output, outputBinding, signal, viewChild } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';

@Component({
  selector: 'app-toast',
  template: `
    <!-- TODO: <div role="alert">{{ message() }} <button>Close</button></div>; Close emits closed -->
  `,
})
export class Toast {
  // TODO: required message input and closed output
}

@Component({
  selector: 'app-toaster',
  template: `
    <button (click)="show('Saved!')">Show toast</button>
    <!-- TODO: Clear all button -->
    <ng-container #outlet />
  `,
})
export class Toaster {
  // TODO: viewChild('outlet', { read: ViewContainerRef })

  show(message: string): ComponentRef<Toast> | undefined {
    // TODO: createComponent(Toast, { bindings: [inputBinding(...), outputBinding(...)] }) and return the ref
    return undefined;
  }
}

@Component({
  selector: 'app-users-widget',
  template: `<h2>{{ title() }}: Users</h2>`,
})
export class UsersWidget {
  readonly title = input.required<string>();
}

@Component({
  selector: 'app-stats-widget',
  template: `<h2>{{ title() }}: Stats</h2>`,
})
export class StatsWidget {
  readonly title = input.required<string>();
}

@Component({
  selector: 'app-dashboard',
  imports: [NgComponentOutlet],
  template: `
    <button (click)="widget.set(users)">Users</button>
    <button (click)="widget.set(stats)">Stats</button>
    <!-- TODO: render widget() with ngComponentOutlet and inputs { title: 'Panel' } -->
  `,
})
export class Dashboard {
  protected readonly users = UsersWidget;
  protected readonly stats = StatsWidget;
  protected readonly widget = signal<Type<unknown>>(UsersWidget);
}
