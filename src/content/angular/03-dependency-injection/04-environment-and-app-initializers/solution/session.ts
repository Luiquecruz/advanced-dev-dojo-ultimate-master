import { EnvironmentProviders, Injectable, InjectionToken, inject, makeEnvironmentProviders, provideAppInitializer, signal } from '@angular/core';

export interface User {
  id: number;
  name: string;
}

export const SESSION_USER_ID = new InjectionToken<number>('SESSION_USER_ID');

@Injectable({ providedIn: 'root' })
export class CurrentUser {
  private readonly userId = inject(SESSION_USER_ID, { optional: true });
  readonly user = signal<User | null>(null);

  async load(): Promise<void> {
    const response = await fetch(`/api/users/${this.userId}`);
    this.user.set(await response.json());
  }
}

export function provideSession(userId: number): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: SESSION_USER_ID, useValue: userId },
    provideAppInitializer(() => inject(CurrentUser).load()),
  ]);
}
