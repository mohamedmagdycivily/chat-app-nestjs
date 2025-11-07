import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  BadRequestException,
  ValidationError,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import {
  STATUS,
  StandardResponse,
  StandardException,
} from './standards/standard.response';
import { flattenValidationErrors, ErrorItem } from './utils.helper';
class InternalException {
  getResponse: () => StandardException;
  getStatus: () => number;
}
class RabbitMQException {
  getResponse: () => StandardException;
  getStatus: () => number;
}
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor() {}

  /**
   * Extracts and normalizes error code to always return a number
   */
  private getNumericErrorCode(exception: any): number {
    if (typeof exception?.getStatus === 'function') {
      const status = exception.getStatus();
      return typeof status === 'number' ? status : 500;
    }
    if (typeof exception?.code === 'number') {
      return exception.code;
    }
    if (typeof exception?.code === 'string' && !isNaN(Number(exception.code))) {
      return Number(exception.code);
    }
    return 500;
  }
  catch(
    exception: HttpException | InternalException | RabbitMQException,
    host: ArgumentsHost,
  ) {
    if (host.getType<'http' | 'rmq'>() === 'rmq') {
      return this.handleRabbitMQException(exception as RabbitMQException);
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    if (exception instanceof HttpException) {
      const error = exception.getResponse();
      const status = exception.getStatus();

      if (typeof error === 'string') {
        return this.handleStringException(error, status, request, response);
      }

      if (error instanceof StandardException) {
        // Handle Validation Error
        return this.handleValidationException(error, status, response);
      }

      // Handle the other 4xx errors
      return this.handle4xxErrors(exception, status, response);
    }

    return this.handle5xxErrors(exception, response);
  }

  private handleRabbitMQException(exception: RabbitMQException) {
    const response = exception?.getResponse?.();
    if (response instanceof StandardException) {
      return;
    }

    console.error('RabbitMQ Exception', {
      error: {
        name: exception.constructor.name,
        message: JSON.stringify(response) ?? '',
        code: this.getNumericErrorCode(exception),
        stack: (exception as any).stack ?? '',
      },
      methodName: this.handleRabbitMQException.name,
      className: HttpExceptionFilter.name,
    });
  }

  private handleStringException(
    error: string,
    status: number,
    request: Request,
    response: Response,
  ) {
    console.error('String Exception', {
      error: {
        name: 'String Exception',
        message: JSON.stringify(error) ?? '',
        code: this.getNumericErrorCode(error),
        stack: (error as any).stack ?? '',
      },
      methodName: this.handleStringException.name,
      className: HttpExceptionFilter.name,
      status,
      method: request.method,
    });
    return response.status(status).json(
      new StandardResponse({
        status: STATUS.ERROR,
        errors: [
          {
            message: error,
          },
        ],
      }),
    );
  }

  private handleValidationException(
    error: StandardException,
    status: number,
    response: Response,
  ) {
    console.error('Validation Exception', {
      error: {
        name: 'Validation Exception',
        message: JSON.stringify(error) ?? '',
        code: this.getNumericErrorCode(error),
        stack: (error as any).stack ?? '',
      },
      methodName: this.handleValidationException.name,
      className: HttpExceptionFilter.name,
      status,
    });
    return response.status(status).json(
      new StandardResponse({
        status: STATUS.ERROR,
        errors: error.errors,
      }),
    );
  }

  private handle5xxErrors(exception: any, response: Response) {
    console.error('5xx Exception', {
      error: {
        name: exception.name ?? '',
        message: exception.message ?? '',
        code: this.getNumericErrorCode(exception),
        stack: exception.stack ?? '',
      },
      methodName: this.handle5xxErrors.name,
      className: HttpExceptionFilter.name,
    });
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      new StandardResponse({
        status: STATUS.ERROR,
        errors: [
          {
            message: 'Internal server error!',
          },
        ],
      }),
    );
  }

  private handle4xxErrors(
    exception: HttpException,
    status: number,
    response: Response,
  ) {
    console.error('4xx Exception', {
      error: {
        name: exception.name ?? '',
        message: exception.message ?? '',
        code: this.getNumericErrorCode(exception),
        stack: exception.stack ?? '',
      },
      status,
      methodName: this.handle4xxErrors.name,
      className: HttpExceptionFilter.name,
    });
    return response.status(status).json(
      new StandardResponse({
        status: STATUS.ERROR,
        errors: [
          {
            ...(exception.getResponse() as any),
          },
        ],
      }),
    );
  }
}

export const exceptionFactory = (validationErrors: ValidationError[] = []) => {
  const errors: ErrorItem[] = flattenValidationErrors(validationErrors, '');
  return new BadRequestException(new StandardException(errors));
};
