const { Component, signal } = require('@angular/core');

@Component({
  selector: 'app-counter',
  template: `<p>Count: {{ count() }}</p><button (click)="count.set(count() + 1)">Increment</button><button (click)="count.set(0)">Reset</button>`,
})
class StartsAtOne {
  count = signal(1);
}

@Component({
  selector: 'app-counter',
  template: `<p>Count: {{ count() }}</p><button>Increment</button><button (click)="count.set(0)">Reset</button>`,
})
class IncrementDoesNothing {
  count = signal(0);
}

@Component({
  selector: 'app-counter',
  template: `<p>Count: {{ count() }}</p><button (click)="count.set(count() + 1)">Increment</button><button>Reset</button>`,
})
class ResetDoesNothing {
  count = signal(0);
}

async function runSpec(component) {
  const cases = [];
  const hooks = [];
  mod.counterSpec({ it: (name, run) => cases.push({ name, run }), beforeEach: (run) => hooks.push(run), expect }, component);
  const failures = [];
  for (const current of cases) {
    TestBed.resetTestingModule();
    try {
      for (const hook of hooks) await hook();
      await current.run();
    } catch {
      failures.push(current.name);
    }
  }
  TestBed.resetTestingModule();
  return { count: cases.length, failures };
}

test('the spec declares at least three cases and all pass against the real Counter', async () => {
  const report = await runSpec(modules['counter.ts'].Counter);
  expect(report.count).toBeGreaterThanOrEqual(3);
  expect(report.failures).toEqual([]);
});

test('the spec catches a counter that starts at 1', async () => {
  const report = await runSpec(StartsAtOne);
  expect(report.failures.length).toBeGreaterThan(0);
});

test('the spec catches an Increment button that does nothing', async () => {
  const report = await runSpec(IncrementDoesNothing);
  expect(report.failures.length).toBeGreaterThan(0);
});

test('the spec catches a Reset button that does nothing', async () => {
  const report = await runSpec(ResetDoesNothing);
  expect(report.failures.length).toBeGreaterThan(0);
});

test('uses TestBed.configureTestingModule, createComponent and whenStable', () => {
  expect(source).toMatch(/TestBed\.configureTestingModule\(/);
  expect(source).toMatch(/TestBed\.createComponent\(/);
  expect(source).toMatch(/\.whenStable\(\s*\)/);
});
