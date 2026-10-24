import { ApplicationConfig, inject, Injectable, signal } from '@angular/core';
import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn, HttpResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  readonly token = signal<string | null>(null);
}

@Injectable({ providedIn: 'root' })
export class RequestLog {
  readonly entries = signal<string[]>([]);

  add(entry: string) {
    this.entries.update((entries) => [...entries, entry]);
  }
}

export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthStore).token();
  if (!token || request.context.get(SKIP_AUTH)) {
    return next(request);
  }
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};

export const loggingInterceptor: HttpInterceptorFn = (request, next) => {
  const log = inject(RequestLog);
  return next(request).pipe(
    tap({
      next: (event) => {
        if (event instanceof HttpResponse) {
          log.add(`${request.method} ${request.urlWithParams} ${event.status}`);
        }
      },
      error: (error: HttpErrorResponse) => log.add(`${request.method} ${request.urlWithParams} ${error.status}`),
    }),
  );
};

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient(withInterceptors([authInterceptor, loggingInterceptor]))],
};
