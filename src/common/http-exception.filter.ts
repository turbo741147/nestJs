import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode = exception.getStatus();
    const body = exception.getResponse();
    const payload =
      typeof body === 'string' ? { message: body } : (body as Record<string, unknown>);
    const message = payload.message ?? exception.message;
    const error =
      payload.error === undefined ? exception.name : String(payload.error);

    response.status(statusCode).json({ statusCode, error, message });
  }
}
