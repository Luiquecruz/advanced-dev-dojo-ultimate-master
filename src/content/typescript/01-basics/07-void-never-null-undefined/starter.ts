interface User {
  id: number;
  name: string;
  nickname?: string;
}

interface Settings {
  retries?: number;
}

function findUser(users: readonly User[], id: number) {
  // TODO: return the user with the given id, or undefined
  return users[0];
}

function displayName(user: User | undefined): string {
  // TODO: remove the non-null assertions and fall back to "Guest"
  return user!.nickname || user!.name;
}

function retryCount(settings: Settings | null): number {
  // TODO: 0 is a valid retry count, only fall back to 3 when retries is missing
  return (settings && settings.retries) || 3;
}

// TODO: annotate the return type as never
function fail(message: string) {
  throw new Error(message);
}
