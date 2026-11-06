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
  if (message.id?.includes('\n') || message.event?.includes('\n')) {
    throw new Error('id and event must not contain line breaks');
  }
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
  for (const line of message.data.split('\n')) {
    frame += `data: ${line}\n`;
  }
  return frame + '\n';
}

export function parseEvents(stream: string): SseEvent[] {
  const events: SseEvent[] = [];
  const lines = stream.split('\n');
  lines.pop();
  let data = '';
  let eventType = '';
  let lastEventId = '';

  for (const line of lines) {
    if (line === '') {
      if (data !== '') {
        events.push({ event: eventType || 'message', data: data.slice(0, -1), lastEventId });
      }
      data = '';
      eventType = '';
      continue;
    }
    if (line.startsWith(':')) {
      continue;
    }
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) {
      value = value.slice(1);
    }
    if (field === 'data') {
      data += value + '\n';
    } else if (field === 'event') {
      eventType = value;
    } else if (field === 'id') {
      lastEventId = value;
    }
  }
  return events;
}

const stream = formatEvent({ id: '1', event: 'price', data: '{"cents":1999}' }) + ': heartbeat\n\n' + formatEvent({ data: 'line one\nline two' });
console.log(JSON.stringify(stream));
console.log(parseEvents(stream));
