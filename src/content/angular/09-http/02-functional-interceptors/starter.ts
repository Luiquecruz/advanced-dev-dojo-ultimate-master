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
  // TODO: read the token from AuthStore
  // TODO: when there is a token and SKIP_AUTH is not set in request.context,
  //       forward a CLONE of the request with the header Authorization: Bearer <token>
  return next(request);
};

export const loggingInterceptor: HttpInterceptorFn = (request, next) => {
  // TODO: add "<METHOD> <urlWithParams> <status>" to RequestLog when the HttpResponse arrives
  // TODO: also log failed requests using the HttpErrorResponse status
  return next(request);
};

export const appConfig: ApplicationConfig = {
  // TODO: register both interceptors (auth first) with withInterceptors()
  providers: [provideHttpClient()],
};
