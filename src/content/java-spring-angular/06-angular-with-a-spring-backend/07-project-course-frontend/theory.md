# Project: Course Catalog Front End

This closing project builds the Angular client for a Spring course catalog API: a paginated, sortable list, a creation form that shows server validation errors next to the fields, and a development setup with no CORS configuration. Unlike the graded challenges, you build it locally with the Angular CLI against the Spring API from modules 04 and 05, and you write its tests with the CLI's test runner.

You need: Calling the API with HttpClient and httpResource, Problem Details and Form Errors, Pagination and Sorting in Angular, Route Guards and CORS, A Typed Client from OpenAPI, Smart and Presentational Components.

## Goal

Create a workspace named `course-catalog-web` with `ng new` (install the CLI with `npm install -g @angular/cli` first, on an active LTS version of Node.js, and answer the prompts, adding routing). The app shows courses from `GET /api/courses`, creates courses with `POST /api/courses` and talks to the Spring server only through the Angular dev server's proxy. The contract below is the one the pages assume; if your API from the earlier modules differs, change the API or the client types, not the contract of this lesson.

| Operation | Request | Response |
| --- | --- | --- |
| List | `GET /api/courses?page=0&size=10&sort=title,asc` | `200` with `{ "content": [...], "page": { "size", "number", "totalElements", "totalPages" } }` |
| Create | `POST /api/courses` with `{ "title": "...", "level": "BEGINNER" }` | `201` with the course, or `400` Problem Details with `errors: [{ "field", "message" }]` |

A course is `{ "id", "title", "level" }` with `level` one of `BEGINNER`, `INTERMEDIATE` and `ADVANCED`.

## Features

- A list page with a table of courses, a page label, **Previous** and **Next** buttons and sortable **Title** and **Level** headers.
- A create page with a Signal Forms form for the title and level.
- Server field errors shown under the matching input, and form-level problems shown in an alert.
- A loading status, an error alert and a **Retry** button on the list page.
- A typed `CourseApi` service that reads its base path from an injection token.
- A `proxy.conf.json` that forwards `/api/**` to the Spring server.

## Acceptance criteria

The criteria use a seeded API with 25 courses titled `Course 01` to `Course 25`, all `BEGINNER`.

1. The first load sends `page=0` and `size=10`, shows `Course 01` to `Course 10` and the label `Page 1 of 3`.
2. **Next** requests `page=1` and shows `Page 2 of 3`. **Previous** is disabled on the first page and **Next** on the third, which shows 5 rows.
3. Clicking **Title** sends `sort=title,asc`, a second click sends `sort=title,desc`, and each change returns to `page=0`.
4. Submitting `Docker Basics` with level `BEGINNER` posts exactly `{ "title": "Docker Basics", "level": "BEGINNER" }` and shows `Created Docker Basics`.
5. Submitting a blank title makes the server answer `400`, and its message `must not be blank` appears under the Title input, with the chosen level kept.
6. With the Spring server stopped, the list shows an alert and **Retry**; after the server starts, **Retry** loads the courses.
7. In the browser's network tab every call goes to the dev server's origin, and the Spring configuration has no CORS mapping.

## Suggested steps

1. Run `ng new course-catalog-web`, then `ng serve`, and check the welcome page before changing anything.
2. Create `src/proxy.conf.json` forwarding `/api/**` to `http://localhost:8080` with `"secure": false`, and set `proxyConfig` in the `serve` options of `angular.json`. Restart `ng serve`.
3. Write the `Course`, `CourseInput` and `Page<T>` types and the `CourseApi` service with `listCourses`, `createCourse` and an `API_BASE_PATH` token whose default is `/api`.
4. Build the list page with an `httpResource` over `pageIndex` and `sort` signals, a small pure function for the query parameters, and a template that checks loading, then error, then data.
5. Build the create page with `form()`, a `required` rule for the title and a `submit()` action that posts through `CourseApi`. Map a Problem Details body to field errors with a type guard.
6. Register the two routes and a navigation link, then check both pages by hand against the running API.
7. Write tests with `ng test`: one for `CourseApi` with `HttpTestingController` that checks the URL, the method and the encoded parameters, and one for the list page that asserts the label after **Next**.

## Stretch goals

- Keep `page` and `sort` in the URL query parameters so a reload shows the same view.
- Split the table row into a presentational component with an input and an output.
- Add a detail route `/courses/:id` that reads the course with an `httpResource`.
- Generate the client from the server's OpenAPI document and compare it with your hand-written service.

## Common mistakes

- Calling `http://localhost:8080/api/courses` from the components. Every request becomes cross-origin and fails until the server adds CORS; use the relative URL `/api/courses` and let the proxy forward it.
- Sending `page=1` for the first page. Spring counts pages from zero.
- Reading `value()` of the list resource before checking its error state, which throws and blanks the page when the server is down.
- Editing `proxy.conf.json` and expecting the running dev server to notice. Restart `ng serve`.

## In practice

This is the shape of a real Angular and Spring pair: a small typed service as the only place that knows URLs, resources for reads, `HttpClient` for writes, one agreed error format and a proxy so the browser sees one origin while you develop. The same client later gains an interceptor for credentials, which module 07 on security introduces.

## Check yourself

1. Why does the proxy remove the need for CORS in development, and what replaces it in production?
2. Where does the `size` and `page` of the first request come from, and how does the label turn `0` into `Page 1`?
3. What does the form show when the server rejects a request with a Problem Details body that has no `errors` list?
