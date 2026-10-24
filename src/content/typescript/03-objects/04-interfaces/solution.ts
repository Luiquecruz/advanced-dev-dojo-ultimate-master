interface Thermostat {
  room: string;
  targetCelsius: number;
  setTarget(celsius: number): void;
  describe(): string;
}

function createThermostat(room: string, targetCelsius: number): Thermostat {
  return {
    room,
    targetCelsius,
    setTarget(celsius) {
      this.targetCelsius = Math.min(30, Math.max(10, celsius));
    },
    describe() {
      return `${this.room}: ${this.targetCelsius}°C`;
    },
  };
}
