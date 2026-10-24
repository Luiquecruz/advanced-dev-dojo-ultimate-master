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
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(serviceType);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('getAdmins() requests GET /api/users and keeps only admins', async () => {
    const admins = firstValueFrom(service.getAdmins());
    const request = http.expectOne('/api/users');
    expect(request.request.method).toBe('GET');
    request.flush([ada, alan]);
    expect(await admins).toEqual([ada]);
  });

  it('updateName() sends a PATCH with the new name', async () => {
    const updated = firstValueFrom(service.updateName(2, 'Alan M. Turing'));
    const request = http.expectOne('/api/users/2');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ name: 'Alan M. Turing' });
    request.flush({ ...alan, name: 'Alan M. Turing' });
    expect((await updated).name).toBe('Alan M. Turing');
  });

  it('propagates server errors', async () => {
    const users = firstValueFrom(service.getUsers());
    http.expectOne('/api/users').flush('Server down', { status: 500, statusText: 'Server Error' });
    await expect(users).rejects.toHaveProperty('status', 500);
  });
}
