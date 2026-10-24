type AppEvent =
  | { type: 'click'; x: number; y: number }
  | { type: 'keypress'; key: string }
  | { type: 'scroll'; offset: number }
  | { type: 'focus' };

// TODO: derive these types from AppEvent
type EventType = string;
type ClickEvent = AppEvent;
type KeyboardOrFocusEvent = AppEvent;
type NonClickEvent = AppEvent;

// TODO: return NonNullable<T>[] and remove only null and undefined
function compact<T>(items: readonly T[]): T[] {
  return items.filter((item) => Boolean(item));
}

function clicksOnly(events: readonly AppEvent[]): ClickEvent[] {
  // TODO: keep only click events
  return [...events];
}
