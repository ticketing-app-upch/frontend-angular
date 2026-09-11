import { Observable, of, timer } from 'rxjs';
import { delay, mergeMap } from 'rxjs/operators';
import { environment } from '../../../enviroments/enviroment';

/** Emite un valor tras la latencia local configurada en el environment. */
export function mockResponse<T>(value: T): Observable<T> {
  return of(value).pipe(delay(environment.mockLatencyMs));
}

/** Emite un error tras la latencia local (útil para comprobar estados de fallo). */
export function mockError<T = never>(message: string, status = 400): Observable<T> {
  return timer(environment.mockLatencyMs).pipe(
    mergeMap(() => {
      throw { status, message };
    }),
  ) as Observable<T>;
}
