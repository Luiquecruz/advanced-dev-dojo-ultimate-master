type Validator = (value: string) => boolean;

const isNotEmpty: Validator = (value) => value.trim().length > 0;

function validateAll(value: string, validators: Validator[]): boolean {
  return validators.every((validator) => validator(value));
}

type Formatter = {
  (value: number): string;
  unit: string;
};

function createFormatter(unit: string, decimals: number): Formatter {
  const format = (value: number) => `${value.toFixed(decimals)} ${unit}`;
  format.unit = unit;
  return format;
}
