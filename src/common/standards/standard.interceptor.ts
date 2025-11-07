import {
  Injectable,
  NestInterceptor,
  CallHandler,
  ExecutionContext,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { STATUS, StandardResponse } from './standard.response';

@Injectable()
export class StandardInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() === 'http') {
      return next
        .handle()
        .pipe(
          map((data) => new StandardResponse({ status: STATUS.SUCCESS, data })),
        );
    }
    return next.handle();
  }
}
