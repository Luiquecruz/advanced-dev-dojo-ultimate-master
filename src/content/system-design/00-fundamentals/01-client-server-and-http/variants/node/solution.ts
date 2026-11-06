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

const METHOD_NOT_ALLOWED: HttpResponse = { status: 405, body: { error: 'method not allowed' } };
const NOTE_NOT_FOUND: HttpResponse = { status: 404, body: { error: 'note not found' } };

export function createNotesApi(): { handle(request: HttpRequest): HttpResponse } {
  const notes: Note[] = [];
  let nextId = 1;

  function handleCollection(request: HttpRequest): HttpResponse {
    if (request.method === 'GET') {
      return { status: 200, body: notes };
    }
    if (request.method !== 'POST') {
      return METHOD_NOT_ALLOWED;
    }
    const text = (request.body as { text?: unknown } | undefined)?.text;
    if (typeof text !== 'string' || text.trim() === '') {
      return { status: 400, body: { error: 'text is required' } };
    }
    const note = { id: nextId++, text };
    notes.push(note);
    return { status: 201, body: note };
  }

  function handleNote(request: HttpRequest, id: number): HttpResponse {
    if (request.method !== 'GET' && request.method !== 'DELETE') {
      return METHOD_NOT_ALLOWED;
    }
    const index = notes.findIndex((note) => note.id === id);
    if (index === -1) {
      return NOTE_NOT_FOUND;
    }
    if (request.method === 'GET') {
      return { status: 200, body: notes[index] };
    }
    notes.splice(index, 1);
    return { status: 204 };
  }

  function handle(request: HttpRequest): HttpResponse {
    if (request.path === '/notes') {
      return handleCollection(request);
    }
    const match = /^\/notes\/(\d+)$/.exec(request.path);
    if (match) {
      return handleNote(request, Number(match[1]));
    }
    return { status: 404, body: { error: 'not found' } };
  }

  return { handle };
}

const api = createNotesApi();
console.log(api.handle({ method: 'POST', path: '/notes', body: { text: 'Buy milk' } }));
console.log(api.handle({ method: 'GET', path: '/notes/1' }));
console.log(api.handle({ method: 'PATCH', path: '/notes' }));
