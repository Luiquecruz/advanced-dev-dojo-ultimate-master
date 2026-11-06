import { NgFor, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface User {
  id: number;
  name: string;
}

@Component({
  selector: 'app-user-list',
  imports: [NgIf, NgFor],
  template: `
    <ul *ngIf="users.length > 0; else empty">
      <li *ngFor="let user of users; let i = index; trackBy: trackById" (click)="select(user)">
        {{ i + 1 }}. {{ user.name }}
      </li>
    </ul>
    <ng-template #empty>
      <p>No users found</p>
    </ng-template>
    <p *ngIf="selected as user">Selected: {{ user.name }}</p>
  `,
})
export class UserListComponent {
  @Input() users: User[] = [];
  selected: User | null = null;

  select(user: User) {
    this.selected = user;
  }

  trackById(index: number, user: User): number {
    return user.id;
  }
}
