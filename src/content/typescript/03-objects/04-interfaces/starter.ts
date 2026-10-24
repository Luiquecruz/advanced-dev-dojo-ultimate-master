interface Thermostat {
  room: string;
  targetCelsius: number;
  // TODO: add the setTarget and describe method signatures
}

function createThermostat(room: string, targetCelsius: number): Thermostat {
  return {
    room,
    targetCelsius,
    // TODO: implement setTarget (clamped between 10 and 30) and describe
  };
}
