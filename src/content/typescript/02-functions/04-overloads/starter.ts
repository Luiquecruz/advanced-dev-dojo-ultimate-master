interface User {
  id: number;
  name: string;
}

const users: User[] = [
  { id: 1, name: 'Ada Lovelace' },
  { id: 2, name: 'Alan Turing' },
  { id: 3, name: 'Grace Hopper' },
];

// TODO: add one overload for a single id and one for a readonly array of ids
function lookupUser(idOrIds: number | readonly number[]): User | User[] | undefined {
  // TODO: return one user (or undefined) for a number, and an array of found users for an array
  return undefined;
}

// TODO: add overloads for (timestamp) and (year, month, day)
function makeDate(yearOrTimestamp: number, month?: number, day?: number): Date {
  if (month !== undefined && day !== undefined) {
    return new Date(yearOrTimestamp, month, day);
  }
  return new Date(yearOrTimestamp);
}
