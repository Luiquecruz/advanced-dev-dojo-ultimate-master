function memoize<This extends object, Arg, Return>(
  target: (this: This, arg: Arg) => Return,
  context: ClassMethodDecoratorContext<This, (this: This, arg: Arg) => Return>,
) {
  const caches = new WeakMap<This, Map<Arg, Return>>();
  return function (this: This, arg: Arg): Return {
    let cache = caches.get(this);
    if (!cache) {
      cache = new Map();
      caches.set(this, cache);
    }
    if (cache.has(arg)) {
      return cache.get(arg) as Return;
    }
    const result = target.call(this, arg);
    cache.set(arg, result);
    return result;
  };
}

function bound<This extends object, Args extends unknown[], Return>(
  target: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>,
) {
  context.addInitializer(function () {
    Object.defineProperty(this, context.name, {
      value: target.bind(this),
      writable: true,
      configurable: true,
    });
  });
}

function clamp(min: number, max: number) {
  return function <This>(
    target: ClassAccessorDecoratorTarget<This, number>,
    context: ClassAccessorDecoratorContext<This, number>,
  ): ClassAccessorDecoratorResult<This, number> {
    const limit = (value: number) => Math.min(max, Math.max(min, value));
    return {
      init(value) {
        return limit(value);
      },
      set(value) {
        target.set.call(this, limit(value));
      },
    };
  };
}

class Thermostat {
  room: string;
  computations = 0;

  @clamp(10, 30)
  accessor target = 20;

  constructor(room: string) {
    this.room = room;
  }

  @memoize
  toFahrenheit(celsius: number): number {
    this.computations++;
    return (celsius * 9) / 5 + 32;
  }

  @bound
  describe(): string {
    return `${this.room}: ${this.target}°C`;
  }
}
