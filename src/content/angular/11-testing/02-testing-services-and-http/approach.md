1. Configure the HTTP testing providers and inject the service and `HttpTestingController` in `beforeEach`.
2. Add `http.verify()` in `afterEach` so stray requests fail the test.
3. For each case: start the call with `firstValueFrom`, `expectOne` the exact URL, assert the method and body, then `flush`.
4. Assert the mapped result after flushing; for errors, flush a 500 and assert the rejection.
5. Check each mutant mentally: which line of your spec would turn red?
