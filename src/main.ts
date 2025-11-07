import { config } from 'dotenv';
config({ path: '.env' });

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  HttpExceptionFilter,
  exceptionFactory,
} from './common/http.exception.filter';
import { StandardInterceptor } from './common/standards/standard.interceptor';
import { ValidationPipe } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';

async function bootstrap() {
  // Nest App Instance Instantiation -----------------------
  const app = await NestFactory.create(ChatModule);

  // Swagger Setup ------------------------------------------
  const swaggerDocumentConfig = new DocumentBuilder()
    .setTitle('Chat Service APIs')
    .setVersion('1.0')
    .build();

  const swaggerDocumentInstance = SwaggerModule.createDocument(
    app,
    swaggerDocumentConfig,
  );
  SwaggerModule.setup('api', app, swaggerDocumentInstance);

  // Globals -----------------------------------------------
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new StandardInterceptor());

  // Server Up ------------------------------------------------
  await app.listen(+process.env.PORT, () => {
    console.log(
      `->>>>>>>>>>>>>>  Server is running on port ${process.env.PORT} <<<<<<<<<<<<<<-`,
    );
  });
}
bootstrap();
