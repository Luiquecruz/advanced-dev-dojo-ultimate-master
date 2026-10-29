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

const notFound = { error: 'Project not found' };
const slugTaken = { error: 'Slug already exists' };

function findProject(id: string): Project | undefined {
  return projects.find((project) => project.id === Number(id));
}

function slugInUse(slug: string, exceptId?: number): boolean {
  return projects.some((project) => project.slug === slug && project.id !== exceptId);
}

app.get('/projects', (c) => c.json(projects));

app.get('/projects/:id{[0-9]+}', (c) => {
  const project = findProject(c.req.param('id'));
  return project ? c.json(project) : c.json(notFound, 404);
});

app.post('/projects', async (c) => {
  const input = await c.req.json<{ slug: string; name: string }>();
  if (slugInUse(input.slug)) {
    return c.json(slugTaken, 409);
  }
  const project: Project = { id: Math.max(0, ...projects.map((item) => item.id)) + 1, slug: input.slug, name: input.name };
  projects.push(project);
  c.header('Location', `/projects/${project.id}`);
  return c.json(project, 201);
});

app.patch('/projects/:id{[0-9]+}', async (c) => {
  const project = findProject(c.req.param('id'));
  if (!project) {
    return c.json(notFound, 404);
  }
  const input = await c.req.json<Partial<Pick<Project, 'slug' | 'name'>>>();
  if (input.slug !== undefined && slugInUse(input.slug, project.id)) {
    return c.json(slugTaken, 409);
  }
  project.slug = input.slug ?? project.slug;
  project.name = input.name ?? project.name;
  return c.json(project);
});

app.delete('/projects/:id{[0-9]+}', (c) => {
  const index = projects.findIndex((project) => project.id === Number(c.req.param('id')));
  if (index === -1) {
    return c.json(notFound, 404);
  }
  projects.splice(index, 1);
  return c.body(null, 204);
});
