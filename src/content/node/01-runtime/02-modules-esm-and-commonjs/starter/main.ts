// TODO: re-export slugify (the default export of slugify.ts) and createId as named exports

export interface Post {
  id: string;
  slug: string;
  title: string;
}

export function createPost(title: string): Post {
  // TODO: import slugify and createId, then return { id: createId('post'), slug, title }
  throw new Error('createPost is not implemented yet');
}

console.log(createPost('Hello, Node Modules!'));
