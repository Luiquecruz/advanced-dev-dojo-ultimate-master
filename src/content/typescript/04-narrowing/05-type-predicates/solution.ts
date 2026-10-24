interface User {
  id: number;
  name: string;
}

function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'number' &&
    'name' in value &&
    typeof value.name === 'string'
  );
}

function validUsers(values: unknown[]): User[] {
  return values.filter(isUser);
}

function compact(values: (string | null | undefined)[]): string[] {
  return values.filter((value) => value != null);
}
