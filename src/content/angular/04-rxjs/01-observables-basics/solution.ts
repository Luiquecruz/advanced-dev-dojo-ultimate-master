import { Observable } from 'rxjs';

export function countdown(start: number, periodMs: number): Observable<number> {
  return new Observable<number>((subscriber) => {
    let current = start;
    subscriber.next(current);
    if (current <= 0) {
      subscriber.complete();
      return;
    }
    const id = setInterval(() => {
      current -= 1;
      subscriber.next(current);
      if (current === 0) {
        subscriber.complete();
      }
    }, periodMs);
    return () => clearInterval(id);
  });
}

export function collect<T>(source: Observable<T>): Promise<T[]> {
  return new Promise<T[]>((resolve, reject) => {
    const values: T[] = [];
    source.subscribe({
      next: (value) => values.push(value),
      error: (error) => reject(error),
      complete: () => resolve(values),
    });
  });
}
