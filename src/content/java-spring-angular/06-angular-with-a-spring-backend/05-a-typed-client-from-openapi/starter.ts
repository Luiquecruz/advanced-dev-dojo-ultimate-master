import { inject, Injectable, InjectionToken } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { EMPTY, Observable } from 'rxjs';

/*
 * Excerpt of the OpenAPI document the server publishes:
 *
 *   GET    /courses?q&page&size   operationId listCourses    200 Page<Course>
 *   GET    /courses/{id}          operationId getCourse      200 Course
 *   POST   /courses               operationId createCourse   body CourseInput, 201 Course
 *   DELETE /courses/{id}          operationId deleteCourse   204 no content
 */

export interface Course {
  id: number;
  title: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
}

export interface CourseInput {
  title: string;
  level: Course['level'];
}

export interface Page<T> {
  content: T[];
  page: { size: number; number: number; totalElements: number; totalPages: number };
}

export interface ListCoursesParams {
  q?: string;
  page?: number;
  size?: number;
}

export const API_BASE_PATH = new InjectionToken<string>('API_BASE_PATH', { providedIn: 'root', factory: () => '/api' });

@Injectable({ providedIn: 'root' })
export class CourseApi {
  private readonly http = inject(HttpClient);
  private readonly basePath = inject(API_BASE_PATH);

  listCourses(params: ListCoursesParams = {}): Observable<Page<Course>> {
    // TODO: GET <basePath>/courses with the query parameters that are defined (0 is a value, undefined is not); HttpParams encodes them
    return EMPTY;
  }

  getCourse(id: number): Observable<Course> {
    // TODO: GET <basePath>/courses/<id>
    return EMPTY;
  }

  createCourse(input: CourseInput): Observable<Course> {
    // TODO: POST <basePath>/courses with the input as the JSON body
    return EMPTY;
  }

  deleteCourse(id: number): Observable<void> {
    // TODO: DELETE <basePath>/courses/<id>, a 204 response has no body
    return EMPTY;
  }
}
