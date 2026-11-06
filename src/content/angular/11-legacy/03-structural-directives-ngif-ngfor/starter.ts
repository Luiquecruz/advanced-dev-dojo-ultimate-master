import { NgFor, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface User {
  id: number;
  name: string;
}

@Component({
  selector: 'app-user-list',
  // TODO: import the NgIf and NgFor directives
  template: `
    <!-- TODO: <ul> shown with *ngIf only when there are users, otherwise the #empty template -->
    <!-- TODO: one <li> per user with *ngFor, index and trackBy: "1. Ada Lovelace"; click selects the user -->
    <!-- TODO: <ng-template #empty> with <p>No users found</p> -->
    <!-- TODO: <p>Selected: ...</p> using *ngIf="selected as user" -->
  `,
})
export class UserListComponent {
  @Input() users: User[] = [];
  selected: User | null = null;

  select(user: User) {
    this.selected = user;
  }

  trackById(index: number, user: User): number {
    // TODO: return the identity used by trackBy
    return index;
  }
}
