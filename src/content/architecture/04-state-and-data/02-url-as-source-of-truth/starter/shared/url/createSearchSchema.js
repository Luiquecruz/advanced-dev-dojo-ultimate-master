export function createSearchSchema(definition) {
  function parse(searchParams) {
    // TODO: read every key of the definition with searchParams.getAll(key) and coerce it by type:
    // string → first value, number → integer within min/max, enum → one of values, list → deduped and sorted.
    // Missing or invalid values fall back to the field default.
    return Object.fromEntries(Object.entries(definition).map(([key, field]) => [key, field.default]));
  }

  function serialize(state) {
    // TODO: return URLSearchParams with keys in alphabetical order, skipping undefined and default values,
    // and one entry per item (sorted, deduped) for list fields.
    return new URLSearchParams();
  }

  return { parse, serialize };
}
