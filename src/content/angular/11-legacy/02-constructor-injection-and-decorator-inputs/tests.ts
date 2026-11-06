const { Component } = require('@angular/core');

@Component({
  selector: 'app-host',
  imports: [mod.RatingComponent],
  template: `<app-rating label="Docs" [value]="score" (rated)="score = $event" />`,
})
class Host {
  score = 2;
}

test('renders label, value and max from decorator inputs', async () => {
  await render(mod.RatingComponent, { inputs: { label: 'Speed', value: 3 } });
  expect(screen.getByText('Speed: 3/5')).toBeInTheDocument();
  expect(screen.getAllByRole('button')).toHaveLength(5);
});

test('value accepts strings thanks to the numberAttribute transform', async () => {
  const { setInput, component } = await render(mod.RatingComponent, { inputs: { label: 'Speed' } });
  await setInput('value', '4');
  expect(screen.getByText('Speed: 4/5')).toBeInTheDocument();
  expect(component.value).toBe(4);
});

test('clicking a star emits `rated` to the parent', async () => {
  await render(Host);
  expect(screen.getByText('Docs: 2/5')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Rate 4' }));
  await stable();
  expect(screen.getByText('Docs: 4/5')).toBeInTheDocument();
});

test('RatingAnalytics is injected through the constructor and receives every rating', async () => {
  const track = fn();
  await render(Host, { providers: [{ provide: mod.RatingAnalytics, useValue: { track } }] });
  await user.click(screen.getByRole('button', { name: 'Rate 5' }));
  expect(track).toHaveBeenCalledWith('Docs', 5);
  expect(source).toMatch(/constructor\s*\(\s*private\s+(readonly\s+)?analytics\s*:\s*RatingAnalytics/);
});

test('uses @Input/@Output decorators and an EventEmitter (legacy APIs)', () => {
  expect(source).toMatch(/@Input\(\s*\)\s*label/);
  expect(source).toMatch(/@Input\(\s*\{\s*transform\s*:\s*numberAttribute\s*\}\s*\)\s*value/);
  expect(source).toMatch(/@Output\(\s*\)\s*rated\s*=\s*new\s+EventEmitter/);
});
