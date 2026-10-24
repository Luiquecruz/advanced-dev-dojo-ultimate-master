// TODO: add EventArgs<Payload> ([] for void payloads, [payload] otherwise) and Listener<Payload>

// TODO: make the class generic over an Events map and replace every `any`
class TypedEmitter {
  #listeners = new Map<string, Set<(payload?: any) => void>>();

  on(event: string, listener: (payload?: any) => void): () => void {
    let listeners = this.#listeners.get(event);
    if (!listeners) {
      listeners = new Set();
      this.#listeners.set(event, listeners);
    }
    listeners.add(listener);
    return () => this.off(event, listener);
  }

  once(event: string, listener: (payload?: any) => void): () => void {
    // TODO: register a wrapper that removes itself before calling listener
    return this.on(event, listener);
  }

  off(event: string, listener: (payload?: any) => void): void {
    this.#listeners.get(event)?.delete(listener);
  }

  emit(event: string, payload?: any): void {
    for (const listener of [...(this.#listeners.get(event) ?? [])]) {
      listener(payload);
    }
  }

  listenerCount(event: string): number {
    return this.#listeners.get(event)?.size ?? 0;
  }
}

type AppEvents = {
  login: { userId: number };
  message: string;
  logout: void;
};

// TODO: pass AppEvents as the type argument
const appEvents = new TypedEmitter();
