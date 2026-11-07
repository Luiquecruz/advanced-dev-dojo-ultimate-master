import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

export interface Filters {
  q: string;
  sort: 'name' | 'price';
  page: number;
}

export const DEFAULT_FILTERS: Filters = { q: '', sort: 'name', page: 1 };

export function parseFilters(params: { get(name: string): string | null }): Filters {
  const page = Number(params.get('page'));
  return {
    q: params.get('q') ?? '',
    sort: params.get('sort') === 'price' ? 'price' : 'name',
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

export function toQueryParams(filters: Filters): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  if (filters.q !== DEFAULT_FILTERS.q) params['q'] = filters.q;
  if (filters.sort !== DEFAULT_FILTERS.sort) params['sort'] = filters.sort;
  if (filters.page !== DEFAULT_FILTERS.page) params['page'] = filters.page;
  return params;
}

@Injectable({ providedIn: 'root' })
export class UrlFilters {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly filters = toSignal(this.route.queryParamMap.pipe(map(parseFilters)), { initialValue: DEFAULT_FILTERS });

  update(changes: Partial<Filters>) {
    const next: Filters = { ...this.filters(), ...changes };
    if (('q' in changes || 'sort' in changes) && !('page' in changes)) next.page = 1;
    void this.router.navigate([], { queryParams: toQueryParams(next) });
  }
}
