## View and content queries

Sometimes a component needs a direct reference to something in its template (an `<input>` to focus, a child component to call) or to components that a parent **projected** into it (the tabs inside a tab group). That is what **queries** are for.

| | Looks in | One result | All results |
| --- | --- | --- | --- |
| View queries | The component's own template | `viewChild()` | `viewChildren()` |
| Content queries | Content projected with `<ng-content>` | `contentChild()` | `contentChildren()` |

### Signal queries (Angular 17.2+, stable since 19)

```ts
import { Component, ElementRef, viewChild, viewChildren } from '@angular/core';

@Component({
  selector: 'app-search',
  template: `
    <input #field />
    <button (click)="focus()">Focus</button>
  `,
})
export class Search {
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  focus() {
    this.field().nativeElement.focus();
  }
}
```

- The **locator** is a template reference name (`'field'`) or a type (`viewChild(ChildComponent)`).
- `viewChild()` returns `Signal<T | undefined>`; `viewChild.required()` returns `Signal<T>` and throws if missing when read.
- `viewChildren()`/`contentChildren()` return `Signal<readonly T[]>`, which updates when `@if`/`@for` add or remove matches. You can use them in `computed()` and templates.
- `{ read: ViewContainerRef }` (or `ElementRef`, `TemplateRef`, a directive) changes **what** you get from the matched node.

### Content queries

```ts
@Component({
  selector: 'app-tab',
  template: `@if (active()) { <ng-content /> }`,
})
export class Tab {
  readonly label = input.required<string>();
  private readonly group = inject(TabGroup);
  readonly active = computed(() => this.group.activeTab() === this);
}

@Component({
  selector: 'app-tab-group',
  template: `
    @for (tab of tabs(); track tab) {
      <button (click)="select($index)">{{ tab.label() }}</button>
    }
    <ng-content />
  `,
})
export class TabGroup {
  readonly tabs = contentChildren(Tab);
  private readonly selected = signal(0);
  readonly activeTab = computed(() => this.tabs()[this.selected()]);
  select(index: number) { this.selected.set(index); }
}
```

Note the two-way relationship: the parent queries its children, and each child **injects** its parent (an ancestor component is available through DI). By default content queries only match **direct** children; pass `{ descendants: true }` to search deeper.

### Timing

Signal queries are resolved during change detection. Reading them in the constructor gives `undefined`/`[]`; read them in templates, `computed()`, `effect()`, `afterNextRender()` or event handlers.

### Legacy decorators

```ts
@ViewChild('field', { static: true }) field!: ElementRef<HTMLInputElement>;
@ViewChildren(Item) items!: QueryList<Item>;
@ContentChildren(Tab) tabs!: QueryList<Tab>;

ngAfterViewInit() { this.field.nativeElement.focus(); }      // view queries ready
ngAfterContentInit() { this.tabs.changes.subscribe(...); }    // content queries ready
```

Decorator queries are plain properties: not reactive, set at specific lifecycle moments, `static: true` to resolve before `ngOnInit`, and a `QueryList` with a `changes` observable for updates. Signal queries remove all of that: no lifecycle hooks, no `!` non-null assertions, and they compose with `computed()`.

### Pitfalls

- Querying a reference that lives inside an `@if` with `viewChild.required`: it throws while the block is hidden. Use the optional `viewChild()`.
- Expecting `viewChildren` to find elements in projected content (or `contentChildren` to find elements in your own template): they look in different places.
- Querying DOM to read state you could pass as inputs. Prefer inputs/outputs; queries are for imperative needs.
