`TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });` then `service = TestBed.inject(serviceType); http = TestBed.inject(HttpTestingController);`.
---
Subscribe first: `const admins = firstValueFrom(service.getAdmins());` then `const request = http.expectOne('/api/users');`, `request.flush([ada, alan]);` and `expect(await admins).toEqual([ada]);`.
---
Check the request itself: `request.request.method` and `request.request.body`. For errors: `http.expectOne('/api/users').flush('Server down', { status: 500, statusText: 'Server Error' })` then `await expect(users).rejects.toHaveProperty('status', 500)`.
