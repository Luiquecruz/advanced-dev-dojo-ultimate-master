export interface SseMessage {
  id?: string;
  event?: string;
  data: string;
  retry?: number;
}

export interface SseEvent {
  event: string;
  data: string;
  lastEventId: string;
}

export function formatEvent(message: SseMessage): string {
  let frame = '';
  if (message.id !== undefined) {
    frame += `id: ${message.id}\n`;
  }
  if (message.event !== undefined) {
    frame += `event: ${message.event}\n`;
  }
  if (message.retry !== undefined) {
    frame += `retry: ${message.retry}\n`;
  }
  // TODO: reject line breaks in id and event
  // TODO: one `data:` line per line of data
  frame += `data: ${message.data}\n`;
  return frame + '\n';
}

export function parseEvents(stream: string): SseEvent[] {
  const events: SseEvent[] = [];
  // TODO: read the stream line by line, keep the data buffer, event type and last event id, dispatch on empty lines
  return events;
}

const stream = formatEvent({ id: '1', event: 'price', data: '{"cents":1999}' }) + ': heartbeat\n\n' + formatEvent({ data: 'line one\nline two' });
console.log(JSON.stringify(stream));
console.log(parseEvents(stream));
