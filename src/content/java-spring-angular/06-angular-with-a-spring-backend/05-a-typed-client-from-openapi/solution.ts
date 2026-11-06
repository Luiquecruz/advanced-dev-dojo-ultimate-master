import { inject, Injectable, InjectionToken } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

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
    let httpParams = new HttpParams();
    for (const [name, value] of Object.entries(params)) {
      if (value !== undefined) {
        httpParams = httpParams.set(name, value);
      }
    }
    return this.http.get<Page<Course>>(`${this.basePath}/courses`, { params: httpParams });
  }

  getCourse(id: number): Observable<Course> {
    return this.http.get<Course>(`${this.basePath}/courses/${id}`);
  }

  createCourse(input: CourseInput): Observable<Course> {
    return this.http.post<Course>(`${this.basePath}/courses`, input);
  }

  deleteCourse(id: number): Observable<void> {
    return this.http.delete<void>(`${this.basePath}/courses/${id}`);
  }
}
