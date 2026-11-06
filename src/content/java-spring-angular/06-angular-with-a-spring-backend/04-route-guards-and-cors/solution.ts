import { ApplicationConfig, Component, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { CanActivateFn, provideRouter, Router, Routes } from '@angular/router';
import { catchError, map, Observable, of } from 'rxjs';

export interface Session {
  username: string;
  roles: string[];
}

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  return inject(HttpClient)
    .get<Session>('/api/me')
    .pipe(
      map(() => true),
      catchError((error: HttpErrorResponse): Observable<boolean | ReturnType<Router['createUrlTree']>> => {
        if (error.status === 401) {
          return of(router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }));
        }
        if (error.status === 403) {
          return of(router.createUrlTree(['/forbidden']));
        }
        return of(router.createUrlTree(['/unavailable']));
      }),
    );
};

export function isCrossOrigin(requestUrl: string, pageOrigin: string): boolean {
  return new URL(requestUrl, pageOrigin).origin !== new URL(pageOrigin).origin;
}

export const devProxyConfig = {
  '/api/**': {
    target: 'http://localhost:8080',
    secure: false,
  },
};

@Component({ selector: 'app-login', template: `<h2>Sign in</h2>` })
export class Login {}

@Component({ selector: 'app-forbidden', template: `<h2>Forbidden</h2>` })
export class Forbidden {}

@Component({ selector: 'app-unavailable', template: `<h2>Service unavailable</h2>` })
export class Unavailable {}

@Component({ selector: 'app-courses', template: `<h2>Courses</h2>` })
export class Courses {}

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'forbidden', component: Forbidden },
  { path: 'unavailable', component: Unavailable },
  { path: 'courses', component: Courses, canActivate: [authGuard] },
];

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient(), provideRouter(routes)],
};
