## Dynamic components

Most components are known at compile time and appear in templates. Some are only known **at runtime**: a toast service, a dialog opened from code, a dashboard whose widgets come from user settings, a CMS that maps block types to components.

### Declarative: `NgComponentOutlet`

When the template knows *where* but not *which* component, bind a component class:

```ts
import { NgComponentOutlet } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  imports: [NgComponentOutlet],
  template: `
    <ng-container *ngComponentOutlet="widget(); inputs: { title: 'Sales' }" />
  `,
})
export class Dashboard {
  protected readonly widget = signal<Type<unknown>>(ChartWidget);
}
```

Changing the `widget` signal destroys the old instance and creates the new one. `inputs` are set with `setInput()` (signal inputs work); `injector` and `content` options are available too.

### Imperative: `ViewContainerRef.createComponent`

When code decides *when* to create something, grab a `ViewContainerRef` (from `inject(ViewContainerRef)` or a `viewChild(..., { read: ViewContainerRef })`) and create the component there:

```ts
import { inputBinding, outputBinding, ViewContainerRef, viewChild } from '@angular/core';

export class Toaster {
  private readonly outlet = viewChild.required('outlet', { read: ViewContainerRef });

  show(message: string) {
    const ref = this.outlet().createComponent(Toast, {
      bindings: [
        inputBinding('message', () => message),
        outputBinding('closed', () => ref.destroy()),
      ],
    });
    return ref;
  }
}
```

```html
<ng-container #outlet />
```

- `createComponent` returns a **`ComponentRef`**: `.instance`, `.setInput(name, value)`, `.destroy()`, `.hostView`, `.location`.
- **Bindings (Angular 20+)**: `inputBinding(name, () => value)` keeps an input in sync with a signal or getter, `outputBinding(name, handler)` subscribes to an output (and unsubscribes on destroy), `twoWayBinding(name, signal)` wires a `model()`.
- The `directives` option applies directives to the created host, like writing them in a template.
- `container.clear()` destroys every view in the container; `container.length` counts them.
- Created components are attached to change detection through their container and destroyed with it.

### Outside any container: `createComponent()`

The standalone `createComponent(Type, { environmentInjector, hostElement })` function creates a component without a container (for example, attached to `document.body` and to `ApplicationRef.attachView`). CDK Overlay and Material dialogs build on these primitives.

### Legacy

```ts
constructor(private resolver: ComponentFactoryResolver, private vcr: ViewContainerRef) {}

const factory = this.resolver.resolveComponentFactory(Toast);
const ref = this.vcr.createComponent(factory);
ref.instance.message = 'Saved';
ref.instance.closed.subscribe(() => ref.destroy());
```

`ComponentFactoryResolver` and `entryComponents` were needed with the old View Engine. With Ivy, pass the class directly. Assigning `ref.instance.x = ...` skips change detection and does not work for signal inputs: use `setInput()` or `inputBinding()`.

### Pitfalls

- Creating components in the constructor via a `viewChild` container: the query is not resolved yet. Create them in response to events or in `afterNextRender()`.
- Forgetting to destroy refs created outside a container: they leak.
- Writing `ref.instance.input = value` for a signal input: signal inputs are read-only from outside; use `setInput`.
