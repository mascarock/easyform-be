import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import serverlessExpress from '@vendia/serverless-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';
import { HttpExceptionFilter, AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

// ---- COPY your main.ts global setup into this bootstrap (helmet, compression, CORS, pipes, filters, interceptors, prefix) ----
let cached: ReturnType<typeof serverlessExpress>;
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // from main.ts:
  const configService = app.get(ConfigService);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  app.use(compression());

  app.enableCors({
    origin: configService.get('app.corsOrigin'),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
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

  app.useGlobalInterceptors(new LoggingInterceptor());

  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

  app.setGlobalPrefix('api/v1');

  // Setup Swagger documentation for serverless
  const config = new DocumentBuilder()
    .setTitle('EasyForm API')
    .setDescription('Secure form submission service for static websites')
    .setVersion('1.0.1')
    .addTag('forms', 'Form submission endpoints')
    .addTag('drafts', 'Draft management endpoints')
    .addTag('health', 'Health check endpoints')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.init();
  const expressApp = app.getHttpAdapter().getInstance();
  return serverlessExpress({ app: expressApp });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!cached) cached = await bootstrap();
  return cached(req, res);
}
