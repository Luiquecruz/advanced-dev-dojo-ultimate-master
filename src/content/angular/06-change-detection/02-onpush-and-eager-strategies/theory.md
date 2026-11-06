# OnPush and Eager Strategies

A rendering notification answers when Angular should do work. A component's change-detection strategy helps determine which views it checks during that work. Angular 22 defaults to `OnPush`; `Eager` is an explicit alternative. Understanding the distinction makes input updates and external callbacks easier to reason about.

You need: [Zoneless Change Detection](/angular/zoneless-change-detection), [Signal Inputs](/angular/signal-inputs), [Event Binding](/angular/event-binding).

## OnPush is the default

In Angular 22, a component without a `changeDetection` setting uses `ChangeDetectionStrategy.OnPush`. Older examples often add it explicitly. That explicit form is still useful when teaching or documenting a component's boundary:

```ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-person',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p>{{ person().name }}</p>',
})
export class PersonCard {
  readonly person = input.required<{ name: string }>();
}
```

Angular checks an OnPush view when relevant notifications mark it for work: changed bound inputs, events in the view or its subtree, consumed signal updates, and explicit marking such as `markForCheck()`. Unrelated clean subtrees can be skipped. OnPush does not mean that a component renders only once, nor does it require all data to live in a global store.

## Input identity matters

For an object input, replacing the object and mutating the existing object are different operations:

```ts
// A new value for the input boundary:
person = { ...person, name: 'Mina' };

// The same object identity:
person.name = 'Mina';
```

Angular compares current and previous input values using `Object.is`. A same-reference mutation does not produce a new input value. A local event can accidentally make the change visible, but that does not make the mutation a reliable update contract. Give the receiving component a new value when its data changes.

Signals also use equality by default. Mutating an object stored in a signal bypasses its setter; replacing the value through `set()` or `update()` makes the change explicit.

## Eager changes checking, not scheduling

`ChangeDetectionStrategy.Eager` means the view is checked eagerly when change detection runs. The old enum name `Default` remains a deprecated alias for Eager in Angular 22. Avoid describing it as the current default; the default strategy and the old enum name no longer mean the same thing.

```ts
@Component({
  selector: 'app-legacy-panel',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '<p>{{ message }}</p>',
})
export class LegacyPanel {
  message = 'Waiting';
}
```

Eager does not make a zoneless application discover every timer or library callback. If unrelated code changes `message` without notifying Angular, choosing Eager does not supply the missing scheduling notification. Keep the scheduler and the checking strategy separate when debugging stale output.

## An external progress update

A progress component can keep its displayed percentage in a signal. Its public callback receives an external update and writes a new value; a computed signal derives the visible status. The callback can be tested directly without clicking inside the view first.

```ts
readonly progress = signal(0);
readonly status = computed(() => this.progress() === 100 ? 'Complete' : 'Running');

receiveProgress(value: number) {
  this.progress.set(value);
}
```

The challenge adds a simple input boundary: clamp finite values to the range from 0 to 100 and ignore non-finite values. Resetting is a normal bound button event. These rules keep rendering tests about observable behavior rather than the spelling of an implementation.

## Common mistakes

- Calling `Default` the default Angular 22 strategy. Its deprecated enum value names Eager; an ordinary component defaults to OnPush.
- Mutating an object input and expecting Angular to treat it as a new input value.
- Choosing Eager to compensate for an external callback that never notifies the zoneless scheduler.
- Forcing checks in every test, masking whether the component's public update method actually schedules a render.

## In practice

Use OnPush boundaries with explicit signal or immutable-input updates. Choose Eager deliberately when integrating code whose checking requirements justify it, and still audit its scheduling notifications. Test external updates and repeated values, not only clicks inside the component.

## Check yourself

1. What is the difference between scheduling a render and deciding to check a view?
2. Why does replacing an input object behave differently from mutating it?
3. Why can an Eager view still show stale data in a zoneless application?
