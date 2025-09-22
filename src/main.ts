import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { HttpExceptionFilter, AllExceptionsFilter } from './common/filters/http-exception.filter';

function configureApp(app: INestApplication): void {
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

  // Setup Swagger documentation
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
}

export async function createNestApp() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  configureApp(app);
  return app;
}

async function bootstrap() {
  const app = await createNestApp();
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const port = configService.get('app.port') || 3001;
  await app.listen(port);

  logger.log(`🚀 EasyForm Backend is running on: http://localhost:${port}`);
  logger.log(`📚 API Documentation: http://localhost:${port}/api/v1/docs`);
  logger.log(`📊 Health check available at: http://localhost:${port}/api/v1/health`);
  logger.log(`📝 Form submission endpoint: http://localhost:${port}/api/v1/forms/submit`);
}

if (require.main === module) {
  bootstrap().catch((e) => { console.error('Error starting the application:', e); process.exit(1); });
}

export { bootstrap };
