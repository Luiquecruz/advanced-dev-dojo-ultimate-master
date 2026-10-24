interface User {
  id: number;
  name: string;
}

const users: User[] = [
  { id: 1, name: 'Ada Lovelace' },
  { id: 2, name: 'Alan Turing' },
  { id: 3, name: 'Grace Hopper' },
];

function lookupUser(id: number): User | undefined;
function lookupUser(ids: readonly number[]): User[];
function lookupUser(idOrIds: number | readonly number[]): User | User[] | undefined {
  if (typeof idOrIds === 'number') {
    return users.find((user) => user.id === idOrIds);
  }
  return idOrIds.flatMap((id) => users.filter((user) => user.id === id));
}

function makeDate(timestamp: number): Date;
function makeDate(year: number, month: number, day: number): Date;
function makeDate(yearOrTimestamp: number, month?: number, day?: number): Date {
  if (month !== undefined && day !== undefined) {
    return new Date(yearOrTimestamp, month, day);
  }
  return new Date(yearOrTimestamp);
}
