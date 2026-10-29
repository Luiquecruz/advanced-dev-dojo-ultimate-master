import { Hono } from 'hono';

export interface Project {
  id: number;
  slug: string;
  name: string;
}

export const projects: Project[] = [
  { id: 1, slug: 'dev-dojo', name: 'Dev Dojo' },
  { id: 2, slug: 'billing', name: 'Billing Service' },
];

export const app = new Hono();

app.get('/projects', (c) => c.json(projects));

// TODO: GET /projects/:id answers 200 or 404 { error: 'Project not found' }

// TODO: POST /projects answers 201 + Location, or 409 { error: 'Slug already exists' }

// TODO: PATCH /projects/:id updates slug and name, with 404 and 409 rules

// TODO: DELETE /projects/:id answers 204 with no body, or 404
