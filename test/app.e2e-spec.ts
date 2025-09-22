import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { FormSubmissionDto } from '../src/common/dto/form-submission.dto';
import { QuestionType } from '../src/common/dto/question.dto';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';
import { AllExceptionsFilter, HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }));
    app.useGlobalInterceptors(new LoggingInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

    const configService = app.get(ConfigService);
    app.enableCors({
      origin: configService.get('app.corsOrigin'),
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
    });

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Health Endpoints', () => {
    it('/api/v1/health (GET)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('database');
          expect(res.body).toHaveProperty('timestamp');
        });
    });

    it('/api/v1/health/live (GET)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health/live')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body).toHaveProperty('timestamp');
        });
    });
  });

  describe('Form Submission', () => {
    const validFormSubmission: FormSubmissionDto = {
      questions: [
        {
          id: 'name',
          type: QuestionType.TEXT,
          title: 'What is your name?',
          required: true,
        },
        {
          id: 'email',
          type: QuestionType.EMAIL,
          title: 'What is your email?',
          required: true,
        },
        {
          id: 'experience',
          type: QuestionType.MULTIPLE_CHOICE,
          title: 'What is your experience level?',
          required: true,
          options: ['Beginner', 'Intermediate', 'Advanced'],
        },
      ],
      answers: {
        name: 'John Doe',
        email: 'john@example.com',
        experience: 'Intermediate',
      },
      userEmail: 'john@example.com',
    };

    it('/api/v1/forms/submit (POST) - should submit valid form', () => {
      return request(app.getHttpServer())
        .post('/api/v1/forms/submit')
        .send(validFormSubmission)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.message).toBe('Form submitted successfully');
          expect(res.body).toHaveProperty('submissionId');
        });
    });

    it('/api/v1/forms/submit (POST) - should reject invalid form', () => {
      const invalidSubmission = {
        ...validFormSubmission,
        answers: {
          name: 'John Doe',
          // Missing required email and experience
        },
      };

      return request(app.getHttpServer())
        .post('/api/v1/forms/submit')
        .send(invalidSubmission)
        .expect(400)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.message).toContain('Form submission failed');
        });
    });

    it('/api/v1/forms/submit (POST) - should reject invalid email', () => {
      const invalidEmailSubmission = {
        ...validFormSubmission,
        answers: {
          ...validFormSubmission.answers,
          email: 'invalid-email',
        },
      };

      return request(app.getHttpServer())
        .post('/api/v1/forms/submit')
        .send(invalidEmailSubmission)
        .expect(400)
        .expect((res) => {
          expect(res.body.success).toBe(false);
        });
    });

    it('/api/v1/forms/submit (POST) - should reject invalid multiple choice answer', () => {
      const invalidChoiceSubmission = {
        ...validFormSubmission,
        answers: {
          ...validFormSubmission.answers,
          experience: 'Invalid Option',
        },
      };

      return request(app.getHttpServer())
        .post('/api/v1/forms/submit')
        .send(invalidChoiceSubmission)
        .expect(400)
        .expect((res) => {
          expect(res.body.success).toBe(false);
        });
    });
  });

  describe('Form Retrieval', () => {
    it('/api/v1/forms/submissions (GET) - should get form submissions', () => {
      return request(app.getHttpServer())
        .get('/api/v1/forms/submissions')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('submissions');
          expect(res.body).toHaveProperty('total');
          expect(Array.isArray(res.body.submissions)).toBe(true);
        });
    });

    it('/api/v1/forms/submissions (GET) - should handle pagination parameters', () => {
      return request(app.getHttpServer())
        .get('/api/v1/forms/submissions?limit=5&offset=0')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('submissions');
          expect(res.body).toHaveProperty('total');
        });
    });

    it('/api/v1/forms/submissions (GET) - should reject invalid pagination', () => {
      return request(app.getHttpServer())
        .get('/api/v1/forms/submissions?limit=0')
        .expect(400);
    });

    it('/api/v1/forms/statistics (GET) - should get form statistics', () => {
      return request(app.getHttpServer())
        .get('/api/v1/forms/statistics')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalSubmissions');
          expect(res.body).toHaveProperty('submissionsByDate');
          expect(res.body).toHaveProperty('averageQuestionsPerSubmission');
          expect(Array.isArray(res.body.submissionsByDate)).toBe(true);
        });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent routes', () => {
      return request(app.getHttpServer())
        .get('/api/v1/non-existent')
        .expect(404);
    });

    it('should handle malformed JSON', () => {
      return request(app.getHttpServer())
        .post('/api/v1/forms/submit')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });
  });
});
