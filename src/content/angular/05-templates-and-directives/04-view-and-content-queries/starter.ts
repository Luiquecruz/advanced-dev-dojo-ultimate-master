import { Component, ElementRef, computed, contentChildren, inject, input, signal, viewChild } from '@angular/core';

@Component({
  selector: 'app-tab',
  template: `
    <!-- TODO: project content only while this tab is active -->
    <ng-content />
  `,
})
export class Tab {
  // TODO: required label input; `active` computed from the parent Tabs (inject it)
}

@Component({
  selector: 'app-tabs',
  template: `
    <!-- TODO: one <button role="tab"> per projected tab with aria-selected -->
    <ng-content />
  `,
})
export class Tabs {
  // TODO: tabs = contentChildren(Tab), selected index signal, activeTab computed, select(index)
}

@Component({
  selector: 'app-search-box',
  template: `
    <input #field aria-label="Search" />
    <!-- TODO: "Focus search" button -->
  `,
})
export class SearchBox {
  // TODO: viewChild for #field and a focus() method
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
