function memoize<This extends object, Arg, Return>(
  target: (this: This, arg: Arg) => Return,
  context: ClassMethodDecoratorContext<This, (this: This, arg: Arg) => Return>,
) {
  // TODO: return a replacement method that caches results per instance (WeakMap) and per argument (Map)
  return target;
}

function bound<This extends object, Args extends unknown[], Return>(
  target: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>,
) {
  // TODO: use context.addInitializer to define a bound copy of the method on each instance
}

function clamp(min: number, max: number) {
  return function <This>(
    target: ClassAccessorDecoratorTarget<This, number>,
    context: ClassAccessorDecoratorContext<This, number>,
  ): ClassAccessorDecoratorResult<This, number> {
    // TODO: return init and set hooks that keep the value between min and max
    return {};
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
