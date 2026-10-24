import { Observable } from 'rxjs';

export function countdown(start: number, periodMs: number): Observable<number> {
  // TODO: return new Observable(subscriber => { ... return teardown; })
  return new Observable<number>();
}

export function collect<T>(source: Observable<T>): Promise<T[]> {
  // TODO: subscribe with { next, error, complete } and settle the Promise
  return Promise.resolve([]);
}
