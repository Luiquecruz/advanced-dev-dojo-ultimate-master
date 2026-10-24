interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  role: 'admin' | 'member';
}

// TODO: derive these types with Pick and Omit
type PublicUser = User;
type UserPreview = User;
type NewUser = User;

function toPublicUser(user: User): PublicUser {
  // TODO: remove passwordHash from the returned object
  return user;
}

function toPreview(user: User): UserPreview {
  // TODO: return only id and name
  return user;
}

function createUser(input: NewUser, id: number, createdAt: Date): User {
  // TODO: combine the input with id and createdAt
  return input;
}
