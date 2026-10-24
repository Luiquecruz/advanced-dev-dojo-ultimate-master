1. Declare `interface Thermostat` with:
   - `room: string`
   - `targetCelsius: number`
   - `setTarget(celsius: number): void` — a method
   - `describe(): string` — a method
2. Implement `createThermostat(room: string, targetCelsius: number): Thermostat`:
   - `setTarget` stores the value **clamped** between `10` and `30` (inclusive)
   - `describe` returns `"<room>: <targetCelsius>°C"`

```ts
const kitchen = createThermostat('Kitchen', 21);
kitchen.describe();   // "Kitchen: 21°C"
kitchen.setTarget(35);
kitchen.describe();   // "Kitchen: 30°C"
```
