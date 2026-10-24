// TODO: describe the real signature instead of Function
type Validator = Function;

// TODO: let Validator type the parameter instead of annotating it
const isNotEmpty: Validator = (value: string) => value.trim().length > 0;

function validateAll(value: string, validators: Validator[]): boolean {
  // TODO: return true only when every validator accepts the value
  return false;
}

// TODO: turn this into an object type with a call signature and a `unit` property
type Formatter = (value: number) => string;

function createFormatter(unit: string, decimals: number): Formatter {
  // TODO: format with `decimals` decimals, append the unit and expose `unit` on the function
  return (value) => String(value);
}
