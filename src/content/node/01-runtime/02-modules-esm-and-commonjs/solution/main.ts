import slugify from './slugify.ts';
import { createId } from './ids.ts';

export { default as slugify } from './slugify.ts';
export { createId } from './ids.ts';

export interface Post {
  id: string;
  slug: string;
  title: string;
}

export function createPost(title: string): Post {
  return { id: createId('post'), slug: slugify(title), title };
}

console.log(createPost('Hello, Node Modules!'));
