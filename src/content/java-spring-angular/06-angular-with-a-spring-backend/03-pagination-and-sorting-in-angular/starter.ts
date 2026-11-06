import { Component, computed, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Page<T> {
  content: T[];
  page: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}

export type SortProperty = 'name' | 'email';

export interface SortState {
  property: SortProperty;
  direction: 'asc' | 'desc';
}

export const PAGE_SIZE = 10;

export function toQueryParams(pageIndex: number, size: number, sort: SortState | null): Record<string, string | number> {
  // TODO: { page, size } plus sort: '<property>,<direction>' (for example 'name,asc') only when a sort is set
  return {};
}

@Component({
  selector: 'app-user-table',
  template: `
    <table>
      <thead>
        <tr>
          <th><button type="button" (click)="sortBy('name')">Name</button></th>
          <th><button type="button" (click)="sortBy('email')">Email</button></th>
        </tr>
      </thead>
      <tbody>
        @if (users.hasValue()) {
          @for (user of users.value().content; track user.id) {
            <tr>
              <td>{{ user.name }}</td>
              <td>{{ user.email }}</td>
            </tr>
          }
        }
      </tbody>
    </table>
    @if (users.hasValue()) {
      <p>Page {{ users.value().page.number + 1 }} of {{ users.value().page.totalPages }}</p>
    }
    <button type="button" (click)="previous()" [disabled]="!hasPrevious()">Previous</button>
    <button type="button" (click)="next()" [disabled]="!hasNext()">Next</button>
  `,
})
export class UserTable {
  protected readonly pageIndex = signal(0);
  protected readonly sort = signal<SortState | null>(null);

  // TODO: an httpResource<Page<User>> for GET /api/users whose params come from toQueryParams(pageIndex(), PAGE_SIZE, sort())
  protected readonly users = {
    hasValue: (): boolean => false,
    value: (): Page<User> => ({ content: [], page: { size: PAGE_SIZE, number: 0, totalElements: 0, totalPages: 0 } }),
  };

  // TODO: false on the first page
  protected readonly hasPrevious = computed(() => false);
  // TODO: true while the current page is not the last one reported by the server (page.totalPages)
  protected readonly hasNext = computed(() => false);

  next() {
    // TODO: move to the following page
  }

  previous() {
    // TODO: move to the preceding page
  }

  sortBy(property: SortProperty) {
    // TODO: first click on a property sorts ascending, the next click on the same property descending; any change returns to the first page
  }
}

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient()],
};
