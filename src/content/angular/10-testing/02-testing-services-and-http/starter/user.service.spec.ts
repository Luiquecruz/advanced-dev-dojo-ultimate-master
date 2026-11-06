import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { UserService, type User } from './user.service';

export interface SpecApi {
  it(name: string, run: () => unknown): void;
  beforeEach(run: () => unknown): void;
  afterEach(run: () => unknown): void;
  expect(actual: unknown): any;
}

const ada: User = { id: 1, name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin' };
const alan: User = { id: 2, name: 'Alan Turing', email: 'alan@example.com', role: 'user' };

export function userServiceSpec({ it, beforeEach, afterEach, expect }: SpecApi, serviceType: Type<UserService> = UserService) {
  let service: UserService;
  let http: HttpTestingController;

  beforeEach(() => {
    // TODO: provide HttpClient + the testing backend, then inject `serviceType` and HttpTestingController
  });

  afterEach(() => {
    // TODO: make sure no unexpected request is left open
  });

  it('getAdmins() requests GET /api/users and keeps only admins', async () => {
    // TODO: subscribe, expectOne('/api/users'), check the method, flush [ada, alan], expect [ada]
  });

  it('updateName() sends a PATCH with the new name', async () => {
    // TODO: call updateName(2, 'Alan M. Turing'), check URL, method and body, flush a response
  });

  it('propagates server errors', async () => {
    // TODO: flush a 500 error for getUsers() and expect the observable to fail with status 500
  });
}
