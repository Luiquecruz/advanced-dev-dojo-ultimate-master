const { provideHttpClient } = require('@angular/common/http');
const { provideHttpClientTesting, HttpTestingController } = require('@angular/common/http/testing');

function setup(extraProviders: unknown[] = []) {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), ...extraProviders] });
  return { api: TestBed.inject(mod.CourseApi), http: TestBed.inject(HttpTestingController) };
}

const ada = { id: 7, title: 'Spring Boot Basics', level: 'BEGINNER' };

test('listCourses() without arguments sends GET /api/courses with no query string', () => {
  const { api, http } = setup();
  const received = fn();
  api.listCourses().subscribe(received);
  const request = http.expectOne('/api/courses');
  expect(request.request.method).toBe('GET');
  const page = { content: [ada], page: { size: 20, number: 0, totalElements: 1, totalPages: 1 } };
  request.flush(page);
  expect(received).toHaveBeenCalledWith(page);
  http.verify();
});

// beginner mistake: skipping falsy values (page 0) or sending the text "undefined" for parameters nobody set
test('listCourses() sends the defined parameters encoded, keeps page 0 and omits undefined ones', () => {
  const { api, http } = setup();
  api.listCourses({ q: 'a&b', page: 0, size: undefined }).subscribe();
  const request = http.expectOne((candidate) => candidate.url === '/api/courses');
  expect(request.request.params.keys().sort()).toEqual(['page', 'q']);
  expect(request.request.params.get('page')).toBe('0');
  expect(request.request.params.get('q')).toBe('a&b');
  expect(request.request.urlWithParams).toContain('q=a%26b');
  expect(request.request.urlWithParams).not.toContain('undefined');
});

test('getCourse() sends GET /api/courses/<id> and createCourse() POSTs the input', () => {
  const { api, http } = setup();
  const created = fn();
  api.getCourse(7).subscribe();
  const get = http.expectOne('/api/courses/7');
  expect(get.request.method).toBe('GET');
  get.flush(ada);
  api.createCourse({ title: 'Spring Boot Basics', level: 'BEGINNER' }).subscribe(created);
  const post = http.expectOne('/api/courses');
  expect(post.request.method).toBe('POST');
  expect(post.request.body).toEqual({ title: 'Spring Boot Basics', level: 'BEGINNER' });
  post.flush(ada, { status: 201, statusText: 'Created' });
  expect(created).toHaveBeenCalledWith(ada);
});

test('deleteCourse() sends DELETE /api/courses/<id> and completes on a 204 response', () => {
  const { api, http } = setup();
  const next = fn();
  const complete = fn();
  api.deleteCourse(7).subscribe({ next, complete });
  const request = http.expectOne('/api/courses/7');
  expect(request.request.method).toBe('DELETE');
  request.flush(null, { status: 204, statusText: 'No Content' });
  expect(next).toHaveBeenCalledTimes(1);
  expect(complete).toHaveBeenCalledTimes(1);
});

test('every URL starts with the API_BASE_PATH token, which defaults to /api', () => {
  expect(TestBed.inject(mod.API_BASE_PATH)).toBe('/api');
  TestBed.resetTestingModule();
  const { api, http } = setup([{ provide: mod.API_BASE_PATH, useValue: 'https://api.example.com/v2' }]);
  api.getCourse(1).subscribe();
  api.deleteCourse(1).subscribe();
  api.createCourse({ title: 'x', level: 'ADVANCED' }).subscribe();
  api.listCourses().subscribe();
  expect(http.match(() => true).map((request) => request.request.url)).toEqual([
    'https://api.example.com/v2/courses/1',
    'https://api.example.com/v2/courses/1',
    'https://api.example.com/v2/courses',
    'https://api.example.com/v2/courses',
  ]);
});
