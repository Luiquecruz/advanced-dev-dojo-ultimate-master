In `Tabs`: `readonly tabs = contentChildren(Tab);` gives a signal with the projected `Tab` instances, updated when `@if` adds or removes one.
---
Keep a `selected = signal(0)` and derive `activeTab = computed(() => this.tabs()[this.selected()])`. Each `Tab` injects its parent with `inject(forwardRef(() => Tabs))` (Tabs is declared later in the file) and computes `active = computed(() => this.tabs.activeTab() === this)`.
---
Wrap the tab's projection: `@if (active()) { <ng-content /> }`. In `Tabs`, render `@for (tab of tabs(); track tab) { <button role="tab" [attr.aria-selected]="tab === activeTab()" (click)="select($index)">{{ tab.label() }}</button> }`.
---
In `SearchBox`: `private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');` and `focus() { this.field().nativeElement.focus(); }`.
