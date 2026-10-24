class Temperature {
  static readonly ABSOLUTE_ZERO = -273.15;
  static #created = 0;
  #celsius = 0;

  private constructor(celsius: number) {
    this.celsius = celsius;
    Temperature.#created++;
  }

  static fromCelsius(value: number): Temperature {
    return new Temperature(value);
  }

  static fromFahrenheit(value: number): Temperature {
    return new Temperature(((value - 32) * 5) / 9);
  }

  static get created(): number {
    return Temperature.#created;
  }

  get celsius(): number {
    return this.#celsius;
  }

  set celsius(value: number) {
    if (value < Temperature.ABSOLUTE_ZERO) {
      throw new RangeError(`Temperature below absolute zero: ${value}`);
    }
    this.#celsius = value;
  }

  get fahrenheit(): number {
    return (this.#celsius * 9) / 5 + 32;
  }
}
