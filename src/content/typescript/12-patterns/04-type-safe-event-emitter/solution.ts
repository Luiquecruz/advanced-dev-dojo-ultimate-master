type EventArgs<Payload> = [Payload] extends [void] ? [] : [payload: Payload];

type Listener<Payload> = (...args: EventArgs<Payload>) => void;

class TypedEmitter<Events extends Record<string, unknown>> {
  #listeners: { [K in keyof Events]?: Set<Listener<Events[K]>> } = {};

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    const listeners = (this.#listeners[event] ??= new Set());
    listeners.add(listener);
    return () => this.off(event, listener);
  }

  once<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    const wrapper: Listener<Events[K]> = (...args) => {
      this.off(event, wrapper);
      listener(...args);
    };
    return this.on(event, wrapper);
  }

  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    this.#listeners[event]?.delete(listener);
  }

  emit<K extends keyof Events>(event: K, ...args: EventArgs<Events[K]>): void {
    for (const listener of [...(this.#listeners[event] ?? [])]) {
      listener(...args);
    }
  }

  listenerCount(event: keyof Events): number {
    return this.#listeners[event]?.size ?? 0;
  }
}

type AppEvents = {
  login: { userId: number };
  message: string;
  logout: void;
};

const appEvents = new TypedEmitter<AppEvents>();
