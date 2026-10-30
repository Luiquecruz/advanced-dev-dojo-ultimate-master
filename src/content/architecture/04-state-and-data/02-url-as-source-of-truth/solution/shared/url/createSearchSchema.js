const INTEGER_PATTERN = /^-?\d+$/;

function parseString(rawValues, field) {
  return rawValues.length > 0 ? rawValues[0] : field.default;
}

function parseNumber(rawValues, field) {
  if (rawValues.length === 0 || !INTEGER_PATTERN.test(rawValues[0])) {
    return field.default;
  }
  const number = Number(rawValues[0]);
  const isInRange = number >= (field.min ?? -Infinity) && number <= (field.max ?? Infinity);
  return isInRange ? number : field.default;
}

function parseEnum(rawValues, field) {
  return field.values.includes(rawValues[0]) ? rawValues[0] : field.default;
}

function normalizeList(values) {
  return [...new Set(values)].sort();
}

function parseList(rawValues, field) {
  const allowedValues = rawValues.filter((value) => value !== '' && (!field.values || field.values.includes(value)));
  return allowedValues.length > 0 ? normalizeList(allowedValues) : [...field.default];
}

const parsers = {
  string: parseString,
  number: parseNumber,
  enum: parseEnum,
  list: parseList,
};

function isDefaultValue(field, value) {
  if (field.type === 'list') {
    return normalizeList(value).join('\u0000') === normalizeList(field.default).join('\u0000');
  }
  return value === field.default;
}

export function createSearchSchema(definition) {
  const keys = Object.keys(definition).sort();

  function parse(searchParams) {
    return Object.fromEntries(keys.map((key) => [key, parsers[definition[key].type](searchParams.getAll(key), definition[key])]));
  }

  function serialize(state) {
    const searchParams = new URLSearchParams();
    keys.forEach((key) => {
      const field = definition[key];
      const value = state[key];
      if (value === undefined || isDefaultValue(field, value)) {
        return;
      }
      if (field.type === 'list') {
        normalizeList(value).forEach((item) => searchParams.append(key, item));
        return;
      }
      searchParams.set(key, String(value));
    });
    return searchParams;
  }

  return { parse, serialize };
}
