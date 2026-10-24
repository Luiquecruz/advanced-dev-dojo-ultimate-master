interface User {
  id: number;
  name: string;
}

// TODO: return a type predicate instead of boolean and check id and name
function isUser(value: unknown): boolean {
  return false;
}

function validUsers(values: unknown[]): User[] {
  // TODO: keep only valid users with filter and isUser
  return [];
}

function compact(values: (string | null | undefined)[]): string[] {
  // TODO: keep empty strings and remove the assertion
  return values.filter(Boolean) as string[];
}
