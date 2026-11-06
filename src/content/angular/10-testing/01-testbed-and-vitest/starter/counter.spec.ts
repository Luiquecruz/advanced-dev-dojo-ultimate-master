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

  beforeEach(async () => {
    // TODO: configure TestBed with `component`, create the fixture, keep nativeElement and await whenStable()
  });

  it('renders "Count: 0" initially', () => {
    // TODO: expect the <p> text to be "Count: 0"
  });

  it('increments when Increment is clicked', async () => {
    // TODO: click Increment twice, await whenStable() and expect "Count: 2"
  });

  it('resets to 0 when Reset is clicked', async () => {
    // TODO: increment, then click Reset and expect "Count: 0"
  });
}
