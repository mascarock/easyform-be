import { NestFactory } from '@nestjs/core';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';
import { HttpExceptionFilter, AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

// Keep a warm instance across invocations
let expressApp: any;

async function getServer() {
  if (expressApp) return expressApp;

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Apply all the global configuration from main.ts
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

  // Setup Swagger documentation with correct path
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
  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.init();
  expressApp = app.getHttpAdapter().getInstance(); // Express instance
  return expressApp;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const server = await getServer();
    return server(req, res);
  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
