interface User {
  id: number;
  name: string;
  nickname?: string;
}

interface Settings {
  retries?: number;
}

function findUser(users: readonly User[], id: number): User | undefined {
  return users.find((user) => user.id === id);
}

function displayName(user: User | undefined): string {
  return user?.nickname ?? user?.name ?? 'Guest';
}

function retryCount(settings: Settings | null): number {
  return settings?.retries ?? 3;
}

function fail(message: string): never {
  throw new Error(message);
}
