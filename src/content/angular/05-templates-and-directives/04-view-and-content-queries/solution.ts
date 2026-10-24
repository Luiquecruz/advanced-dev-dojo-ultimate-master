import { Component, ElementRef, computed, contentChildren, forwardRef, inject, input, signal, viewChild } from '@angular/core';

@Component({
  selector: 'app-tab',
  template: `
    @if (active()) {
      <ng-content />
    }
  `,
})
export class Tab {
  readonly label = input.required<string>();
  private readonly tabs = inject(forwardRef(() => Tabs));
  readonly active = computed(() => this.tabs.activeTab() === this);
}

@Component({
  selector: 'app-tabs',
  template: `
    @for (tab of tabs(); track tab) {
      <button role="tab" [attr.aria-selected]="tab === activeTab()" (click)="select($index)">{{ tab.label() }}</button>
    }
    <ng-content />
  `,
})
export class Tabs {
  readonly tabs = contentChildren(Tab);
  private readonly selected = signal(0);
  readonly activeTab = computed(() => this.tabs()[this.selected()]);

  select(index: number) {
    this.selected.set(index);
  }
}

@Component({
  selector: 'app-search-box',
  template: `
    <input #field aria-label="Search" />
    <button (click)="focus()">Focus search</button>
  `,
})
export class SearchBox {
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  focus() {
    this.field().nativeElement.focus();
  }
}

@Component({
  selector: 'app-root',
  imports: [Tabs, Tab, SearchBox],
  template: `
    <app-tabs>
      <app-tab label="Profile"><p>Profile content</p></app-tab>
      <app-tab label="Settings"><p>Settings content</p></app-tab>
      @if (showExtra()) {
        <app-tab label="Extra"><p>Extra content</p></app-tab>
      }
    </app-tabs>
    <button (click)="showExtra.set(true)">Add tab</button>
    <app-search-box />
  `,
})
export class App {
  protected readonly showExtra = signal(false);
}
