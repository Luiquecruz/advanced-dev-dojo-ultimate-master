import { Component, ComponentRef, Type, ViewContainerRef, input, inputBinding, output, outputBinding, signal, viewChild } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';

@Component({
  selector: 'app-toast',
  template: `<div role="alert">{{ message() }} <button (click)="closed.emit()">Close</button></div>`,
})
export class Toast {
  readonly message = input.required<string>();
  readonly closed = output<void>();
}

@Component({
  selector: 'app-toaster',
  template: `
    <button (click)="show('Saved!')">Show toast</button>
    <button (click)="clear()">Clear all</button>
    <ng-container #outlet />
  `,
})
export class Toaster {
  private readonly outlet = viewChild.required('outlet', { read: ViewContainerRef });

  show(message: string): ComponentRef<Toast> {
    const ref: ComponentRef<Toast> = this.outlet().createComponent(Toast, {
      bindings: [inputBinding('message', () => message), outputBinding('closed', () => ref.destroy())],
    });
    return ref;
  }

  clear() {
    this.outlet().clear();
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
    <ng-container *ngComponentOutlet="widget(); inputs: { title: 'Panel' }" />
  `,
})
export class Dashboard {
  protected readonly users = UsersWidget;
  protected readonly stats = StatsWidget;
  protected readonly widget = signal<Type<unknown>>(UsersWidget);
}
