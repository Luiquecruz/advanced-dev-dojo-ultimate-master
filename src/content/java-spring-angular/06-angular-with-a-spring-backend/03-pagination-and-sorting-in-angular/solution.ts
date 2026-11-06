import { Component, computed, signal } from '@angular/core';
import { httpResource, provideHttpClient } from '@angular/common/http';
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
  const params: Record<string, string | number> = { page: pageIndex, size };
  if (sort) {
    params['sort'] = `${sort.property},${sort.direction}`;
  }
  return params;
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

  protected readonly users = httpResource<Page<User>>(() => ({
    url: '/api/users',
    params: toQueryParams(this.pageIndex(), PAGE_SIZE, this.sort()),
  }));

  protected readonly hasPrevious = computed(() => this.pageIndex() > 0);
  protected readonly hasNext = computed(() => {
    if (!this.users.hasValue()) {
      return false;
    }
    return this.pageIndex() + 1 < this.users.value().page.totalPages;
  });

  next() {
    this.pageIndex.update((index) => index + 1);
  }

  previous() {
    this.pageIndex.update((index) => index - 1);
  }

  sortBy(property: SortProperty) {
    const current = this.sort();
    const direction = current?.property === property && current.direction === 'asc' ? 'desc' : 'asc';
    this.sort.set({ property, direction });
    this.pageIndex.set(0);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient()],
};
