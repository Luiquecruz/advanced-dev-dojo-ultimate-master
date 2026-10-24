`Toast` needs `readonly message = input.required<string>();` and `readonly closed = output<void>();`, with `(click)="closed.emit()"` on its button.
---
Query the anchor as a container: `private readonly outlet = viewChild.required('outlet', { read: ViewContainerRef });`.
---
Declare the ref first so the output handler can reference it: `const ref: ComponentRef<Toast> = this.outlet().createComponent(Toast, { bindings: [inputBinding('message', () => message), outputBinding('closed', () => ref.destroy())] }); return ref;`.
---
Dashboard: `<ng-container *ngComponentOutlet="widget(); inputs: { title: 'Panel' }" />`.
