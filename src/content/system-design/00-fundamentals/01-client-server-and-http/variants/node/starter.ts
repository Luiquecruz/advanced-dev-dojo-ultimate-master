export interface HttpRequest {
  method: string;
  path: string;
  body?: unknown;
}

export interface HttpResponse {
  status: number;
  body?: unknown;
}

interface Note {
  id: number;
  text: string;
}

export function createNotesApi(): { handle(request: HttpRequest): HttpResponse } {
  const notes: Note[] = [];
  let nextId = 1;

  function handle(request: HttpRequest): HttpResponse {
    if (request.path === '/notes' && request.method === 'GET') {
      return { status: 200, body: notes };
    }
    if (request.path === '/notes' && request.method === 'POST') {
      // TODO: validate text (400) and answer 201 with the created note
      const text = (request.body as { text?: string } | undefined)?.text ?? '';
      const note = { id: nextId++, text };
      notes.push(note);
      return { status: 200, body: note };
    }
    // TODO: GET and DELETE /notes/<id> with 404 for a missing note
    // TODO: 405 for other methods on a known path, 404 for unknown paths
    return { status: 200, body: { error: 'not found' } };
  }

  return { handle };
}

const api = createNotesApi();
console.log(api.handle({ method: 'POST', path: '/notes', body: { text: 'Buy milk' } }));
console.log(api.handle({ method: 'GET', path: '/notes/1' }));
console.log(api.handle({ method: 'PATCH', path: '/notes' }));
