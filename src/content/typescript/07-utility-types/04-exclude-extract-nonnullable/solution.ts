type AppEvent =
  | { type: 'click'; x: number; y: number }
  | { type: 'keypress'; key: string }
  | { type: 'scroll'; offset: number }
  | { type: 'focus' };

type EventType = AppEvent['type'];
type ClickEvent = Extract<AppEvent, { type: 'click' }>;
type KeyboardOrFocusEvent = Extract<AppEvent, { type: 'keypress' | 'focus' }>;
type NonClickEvent = Exclude<AppEvent, { type: 'click' }>;

function compact<T>(items: readonly T[]): NonNullable<T>[] {
  return items.filter((item): item is NonNullable<T> => item !== null && item !== undefined);
}

function clicksOnly(events: readonly AppEvent[]): ClickEvent[] {
  return events.filter((event): event is ClickEvent => event.type === 'click');
}
