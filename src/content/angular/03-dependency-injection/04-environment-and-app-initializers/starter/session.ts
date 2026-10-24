import { EnvironmentProviders, Injectable, InjectionToken, inject, makeEnvironmentProviders, provideAppInitializer, signal } from '@angular/core';

export interface User {
  id: number;
  name: string;
}

// TODO: export const SESSION_USER_ID = new InjectionToken<number>(...)

@Injectable({ providedIn: 'root' })
export class CurrentUser {
  // TODO: `user` signal (null at first)
  // TODO: inject SESSION_USER_ID (optionally) and implement async load()
}

export function provideSession(userId: number): EnvironmentProviders {
  // TODO: makeEnvironmentProviders([...]) with the token value and an app initializer
  return makeEnvironmentProviders([]);
}
