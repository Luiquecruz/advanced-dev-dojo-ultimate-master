const { Component } = require('@angular/core');
const QuantityPicker = modules['quantity-picker.ts'].QuantityPicker;

@Component({
  selector: 'test-host',
  imports: [QuantityPicker],
  template: `<app-quantity-picker [max]="3" (valueChange)="changes.push($event)" />`,
})
class Host {
  changes: number[] = [];
}

const shownValue = (element: HTMLElement) => element.querySelector('.value')!.textContent!.trim();

test('renders the value and changes it with the buttons', async () => {
  const { element, component } = await render(QuantityPicker);
  expect(shownValue(element)).toBe('1');
  await user.click(screen.getByRole('button', { name: 'Increase' }));
  await user.click(screen.getByRole('button', { name: 'Increase' }));
  await user.click(screen.getByRole('button', { name: 'Decrease' }));
  await stable();
  expect(shownValue(element)).toBe('2');
  expect(component.value()).toBe(2);
});

test('disables the buttons at min and max', async () => {
  const { setInput } = await render(QuantityPicker);
  expect(screen.getByRole('button', { name: 'Decrease' })).toBeDisabled();
  await setInput('value', 10);
  expect(screen.getByRole('button', { name: 'Increase' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Decrease' })).toBeEnabled();
});

test('emits valueChange and respects max', async () => {
  const { component } = await render(Host);
  const increase = screen.getByRole('button', { name: 'Increase' });
  await user.click(increase);
  await user.click(increase);
  await stable();
  expect(component.changes).toEqual([2, 3]);
  expect(increase).toBeDisabled();
});

test('App keeps quantity in sync in both directions', async () => {
  const { element } = await render(mod.App);
  expect(shownValue(element)).toBe('2');
  expect(element.querySelector('.total')).toHaveTextContent('Total: $30');
  await user.click(screen.getByRole('button', { name: 'Increase' }));
  await stable();
  expect(element.querySelector('.total')).toHaveTextContent('Total: $45');
  await user.click(screen.getByRole('button', { name: 'Reset' }));
  await stable();
  expect(shownValue(element)).toBe('1');
  expect(element.querySelector('.total')).toHaveTextContent('Total: $15');
});

test('uses model() and the banana-in-a-box syntax', () => {
  expect(sources['quantity-picker.ts']).toMatch(/value\s*=\s*model\s*(<[^>]*>)?\s*\(\s*1\s*\)/);
  expect(source).toMatch(/\[\(value\)\]\s*=\s*"quantity"/);
});
