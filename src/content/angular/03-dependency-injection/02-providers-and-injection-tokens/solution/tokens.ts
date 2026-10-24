import { InjectionToken } from '@angular/core';

export const GREETING = new InjectionToken<string>('GREETING', {
  providedIn: 'root',
  factory: () => 'Hello',
});

export abstract class Logger {
  abstract log(message: string): void;
}

export class MemoryLogger extends Logger {
  readonly messages: string[] = [];

  log(message: string) {
    this.messages.push(message);
  }
}
