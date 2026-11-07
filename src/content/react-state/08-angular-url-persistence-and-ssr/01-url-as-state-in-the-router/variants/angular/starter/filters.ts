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
  // TODO: q, sort and page with the defaults described in the challenge
  return DEFAULT_FILTERS;
}

export function toQueryParams(filters: Filters): Record<string, string | number> {
  // TODO: only the values that differ from the defaults
  return {};
}

@Injectable({ providedIn: 'root' })
export class UrlFilters {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // TODO: `filters` signal derived from route.queryParamMap

  update(changes: Partial<Filters>) {
    // TODO: navigate with the merged filters; reset the page when another filter changes
  }
}
