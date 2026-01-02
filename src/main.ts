import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { AppModule } from './app.module';
import { winstonLogger } from './common/logger/winston.logger';
import { NestWinstonAdapter } from './common/logger/nest-winston.adapter';

const envPath = path.resolve(process.cwd(), '.env');

dotenv.config({ path: envPath });

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new NestWinstonAdapter(),
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  app.setGlobalPrefix('api', {
    exclude: ['', 'docs', 'docs-json', 'docs/(.*)'],
  });

  const config = new DocumentBuilder()
    .setTitle('Event Management API')
    .setDescription(
      'REST API for managing events, registrations, and real-time seat availability',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Event Management API Docs',
    customCssUrl: '/docs/swagger-ui.css',
  });

  const port = process.env.PORT ?? 4000;

  winstonLogger.info(`🚀 Application is running on: http://localhost:${port}`, {
    context: 'Bootstrap',
  });

  winstonLogger.info(
    `📚 Swagger documentation: http://localhost:${port}/api-docs`,
    {
      context: 'Bootstrap',
    },
  );

  winstonLogger.info(
    `🌍 Environment: ${process.env.NODE_ENV || 'development'}`,
    {
      context: 'Bootstrap',
    },
  );

  await app.listen(port);
}

bootstrap().catch((error) => {
  winstonLogger.error('Failed to start application', error);
  process.exit(1);
});
