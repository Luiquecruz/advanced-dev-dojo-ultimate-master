import { ApplicationConfig, Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { CanActivateFn, provideRouter, Routes } from '@angular/router';

export interface Session {
  username: string;
  roles: string[];
}

export const authGuard: CanActivateFn = (route, state) => {
  // TODO: GET /api/me with HttpClient (typed as Session) and answer with an Observable:
  //   200 -> true
  //   401 -> a UrlTree for /login with the query parameter returnUrl set to state.url
  //   403 -> a UrlTree for /forbidden
  //   any other failure (5xx, network error) -> a UrlTree for /unavailable
  return true;
};

export function isCrossOrigin(requestUrl: string, pageOrigin: string): boolean {
  // TODO: true when the request URL (resolved against pageOrigin) has a different scheme, host or port than pageOrigin
  return false;
}

export const devProxyConfig = {
  // TODO: the content of proxy.conf.json: forward /api/** to http://localhost:8080 over plain HTTP (secure: false)
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
  { path: 'courses', component: Courses /* TODO: protect this route with authGuard */ },
];

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient(), provideRouter(routes)],
};
