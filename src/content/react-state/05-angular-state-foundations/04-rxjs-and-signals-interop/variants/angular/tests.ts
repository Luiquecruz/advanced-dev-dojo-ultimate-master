const setup = () => {
  const facade = TestBed.inject(mod.UsersFacade);
  const legacy = TestBed.inject(mod.LegacyUsers);
  return { facade, legacy };
};

test('users is a signal that follows the BehaviorSubject', () => {
  const { facade, legacy } = setup();
  expect(facade.users()).toEqual([]);
  legacy.add('Ada');
  facade.add('Alan');
  expect(facade.users()).toEqual(['Ada', 'Alan']);
  expect(facade.count()).toBe(2);
});

test('filtered matches the query ignoring case', () => {
  const { facade } = setup();
  ['Ada', 'Alan', 'Grace'].forEach((name) => facade.add(name));
  facade.query.set('AL');
  expect(facade.filtered()).toEqual(['Alan']);
  facade.query.set('a');
  expect(facade.filtered()).toEqual(['Ada', 'Alan', 'Grace']);
});

test('added records every added name', () => {
  const { facade } = setup();
  facade.add('Ada');
  facade.add('Grace');
  expect(facade.added).toEqual(['Ada', 'Grace']);
});

test('nothing is recorded after the facade is destroyed', () => {
  const { facade, legacy } = setup();
  facade.add('Ada');
  TestBed.resetTestingModule();
  legacy.added$.next('Late');
  expect(facade.added).toEqual(['Ada']);
});

test('the bridge uses toSignal with requireSync and takeUntilDestroyed', () => {
  expect(sources['bridge.ts']).toMatch(/toSignal\(\s*this\.legacy\.users\$/);
  expect(sources['bridge.ts']).toMatch(/requireSync:\s*true/);
  expect(sources['bridge.ts']).toMatch(/takeUntilDestroyed\(/);
});
