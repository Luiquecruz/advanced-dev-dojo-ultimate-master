import type { Type } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Counter } from './counter';

export interface SpecApi {
  it(name: string, run: () => unknown): void;
  beforeEach(run: () => unknown): void;
  expect(actual: unknown): any;
}

export function counterSpec({ it, beforeEach, expect }: SpecApi, component: Type<unknown> = Counter) {
  let fixture: ComponentFixture<unknown>;
  let element: HTMLElement;

  const button = (name: string) =>
    Array.from(element.querySelectorAll('button')).find((candidate) => candidate.textContent?.trim() === name)!;

  const countText = () => element.querySelector('p')?.textContent?.trim();

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [component] });
    fixture = TestBed.createComponent(component);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('renders "Count: 0" initially', () => {
    expect(countText()).toBe('Count: 0');
  });

  it('increments when Increment is clicked', async () => {
    button('Increment').click();
    button('Increment').click();
    await fixture.whenStable();
    expect(countText()).toBe('Count: 2');
  });

  it('resets to 0 when Reset is clicked', async () => {
    button('Increment').click();
    await fixture.whenStable();
    button('Reset').click();
    await fixture.whenStable();
    expect(countText()).toBe('Count: 0');
  });
}
