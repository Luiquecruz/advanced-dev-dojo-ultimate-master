const { Injectable } = require('@angular/core');
const { map } = require('rxjs');
const RealUserService = modules['user.service.ts'].UserService;

@Injectable({ providedIn: 'root' })
class WrongUrl extends RealUserService {
  getUsers() {
    return this.http.get('/api/user');
  }
}

@Injectable({ providedIn: 'root' })
class NoAdminFilter extends RealUserService {
  getAdmins() {
    return this.getUsers().pipe(map((users) => users));
  }
}

@Injectable({ providedIn: 'root' })
class PutInsteadOfPatch extends RealUserService {
  updateName(id, name) {
    return this.http.put(`/api/users/${id}`, { name });
  }
}

@Injectable({ providedIn: 'root' })
class ExtraRefreshRequest extends RealUserService {
  updateName(id, name) {
    this.getUsers().subscribe();
    return super.updateName(id, name);
  }
}

async function runSpec(serviceType) {
  const cases = [];
  const before = [];
  const after = [];
  mod.userServiceSpec(
    { it: (name, run) => cases.push({ name, run }), beforeEach: (run) => before.push(run), afterEach: (run) => after.push(run), expect },
    serviceType,
  );
  const failures = [];
  for (const current of cases) {
    TestBed.resetTestingModule();
    try {
      for (const hook of before) await hook();
      await current.run();
      for (const hook of after) await hook();
    } catch {
      failures.push(current.name);
    }
  }
  TestBed.resetTestingModule();
  return { count: cases.length, failures };
}

test('the spec declares at least three cases and all pass against the real UserService', async () => {
  const report = await runSpec(RealUserService);
  expect(report.count).toBeGreaterThanOrEqual(3);
  expect(report.failures).toEqual([]);
});

test('the spec catches a service that calls the wrong URL', async () => {
  expect((await runSpec(WrongUrl)).failures.length).toBeGreaterThan(0);
});

test('the spec catches getAdmins() returning every user', async () => {
  expect((await runSpec(NoAdminFilter)).failures.length).toBeGreaterThan(0);
});

test('the spec catches updateName() using PUT instead of PATCH', async () => {
  expect((await runSpec(PutInsteadOfPatch)).failures.length).toBeGreaterThan(0);
});

test('the spec catches an unexpected extra request (HttpTestingController.verify)', async () => {
  expect((await runSpec(ExtraRefreshRequest)).failures.length).toBeGreaterThan(0);
});

test('uses provideHttpClientTesting and HttpTestingController', () => {
  expect(source).toMatch(/provideHttpClientTesting\(\s*\)/);
  expect(source).toMatch(/TestBed\.inject\(\s*HttpTestingController\s*\)/);
  expect(source).toMatch(/\.verify\(\s*\)/);
});
