declare module 'events/events.js' {
  import { EventEmitter } from 'events';
  export default EventEmitter;
}

declare module 'buffer/index.js' {
  const buffer: typeof import('buffer');
  export default buffer;
}
