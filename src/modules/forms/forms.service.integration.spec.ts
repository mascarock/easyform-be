import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FormsService } from './forms.service';
import { FormValidationService } from '../../common/validators/form-validation.validator';
import { FormSubmission, FormSubmissionSchema, FormSubmissionDocument } from '../../common/schemas/form-submission.schema';
import { FormSubmissionDto } from '../../common/dto/form-submission.dto';
import { QuestionType } from '../../common/dto/question.dto';
import { Model } from 'mongoose';
import * as mongoose from 'mongoose';

describe('FormsService Integration Tests', () => {
  let service: FormsService;
  let module: TestingModule;
  let configService: ConfigService;
  let formSubmissionModel: Model<FormSubmissionDocument>;

  beforeAll(async () => {
    // Use test database
    const testDbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/easyform-test';
    
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              database: {
                uri: testDbUri,
                database: 'easyform-test',
              },
              app: {
                maxQuestionnaireLength: 50,
                maxAnswerLength: 1000,
              },
            }),
          ],
        }),
        MongooseModule.forRoot(testDbUri),
        MongooseModule.forFeature([
          { name: FormSubmission.name, schema: FormSubmissionSchema },
        ]),
      ],
      providers: [
        FormsService,
        FormValidationService,
      ],
    }).compile();

    service = module.get<FormsService>(FormsService);
    configService = module.get<ConfigService>(ConfigService);
    formSubmissionModel = module.get<Model<FormSubmissionDocument>>(getModelToken(FormSubmission.name));
  });

  afterAll(async () => {
    // Clean up test database
    await mongoose.connection.db.dropDatabase();
    await module.close();
  });

  beforeEach(async () => {
    // Clear the test collection before each test
    await formSubmissionModel.deleteMany({});
  });

  describe('MongoDB Connection and Configuration', () => {
    it('should connect to MongoDB using MONGODB_URI', async () => {
      expect(mongoose.connection.readyState).toBe(1); // Connected
      expect(configService.get('database.uri')).toContain('mongodb://');
    });

    it('should use correct database name', () => {
      expect(configService.get('database.database')).toBe('easyform-test');
    });

    it('should have proper configuration values', () => {
      expect(configService.get('app.maxQuestionnaireLength')).toBe(50);
      expect(configService.get('app.maxAnswerLength')).toBe(1000);
    });
  });

  describe('Database Write Operations', () => {
    it('should successfully save form submission to MongoDB', async () => {
      const submissionData: FormSubmissionDto = {
        formId: 'test-form-123',
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
        ],
        answers: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        userEmail: 'john@example.com',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        ipAddress: '127.0.0.1',
      };

      const result = await service.submitForm(submissionData);

      expect(result.success).toBe(true);
      expect(result.submissionId).toBeDefined();
      expect(result.message).toBe('Form submitted successfully');

      // Verify the document was actually saved to MongoDB
      const savedDoc = await formSubmissionModel.findById(result.submissionId);
      expect(savedDoc).toBeTruthy();
      expect(savedDoc.formId).toBe('test-form-123');
      expect(savedDoc.userEmail).toBe('john@example.com');
      expect(savedDoc.questions).toHaveLength(2);
      expect(savedDoc.answers).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
      });
      expect(savedDoc.submittedAt).toBeInstanceOf(Date);
      expect(savedDoc.metadata).toMatchObject({
        version: '1.0.0',
        source: 'easyform-frontend',
      });
    });

    it('should save form submission with minimal required fields', async () => {
      const minimalSubmission: FormSubmissionDto = {
        questions: [
          {
            id: 'feedback',
            type: QuestionType.TEXT,
            title: 'Your feedback',
            required: true,
          },
        ],
        answers: {
          feedback: 'Great service!',
        },
      };

      const result = await service.submitForm(minimalSubmission);

      expect(result.success).toBe(true);
      expect(result.submissionId).toBeDefined();

      const savedDoc = await formSubmissionModel.findById(result.submissionId);
      expect(savedDoc).toBeTruthy();
      expect(savedDoc.questions).toHaveLength(1);
      expect(savedDoc.answers).toEqual({ feedback: 'Great service!' });
      expect(savedDoc.formId).toBeUndefined();
      expect(savedDoc.userEmail).toBeUndefined();
    });

    it('should save form submission with custom metadata', async () => {
      const submissionData: FormSubmissionDto = {
        questions: [
          {
            id: 'rating',
            type: QuestionType.MULTIPLE_CHOICE,
            title: 'Rate our service',
            required: true,
            options: ['1', '2', '3', '4', '5'],
          },
        ],
        answers: {
          rating: '5',
        },
      };

      const customMetadata = {
        campaign: 'summer-2024',
        source: 'mobile-app',
        version: '2.1.0',
      };

      const result = await service.submitForm(submissionData, customMetadata);

      expect(result.success).toBe(true);

      const savedDoc = await formSubmissionModel.findById(result.submissionId);
      expect(savedDoc.metadata).toMatchObject({
        ...customMetadata,
        version: '1.0.0', // Should be overridden by service
        source: 'easyform-frontend', // Should be overridden by service
      });
    });

    it('should handle multiple choice questions correctly', async () => {
      const submissionData: FormSubmissionDto = {
        questions: [
          {
            id: 'experience',
            type: QuestionType.MULTIPLE_CHOICE,
            title: 'What is your experience level?',
            required: true,
            options: ['Beginner', 'Intermediate', 'Advanced'],
          },
        ],
        answers: {
          experience: 'Intermediate',
        },
      };

      const result = await service.submitForm(submissionData);

      expect(result.success).toBe(true);

      const savedDoc = await formSubmissionModel.findById(result.submissionId);
      expect(savedDoc.questions[0].type).toBe(QuestionType.MULTIPLE_CHOICE);
      expect(savedDoc.questions[0].options).toEqual(['Beginner', 'Intermediate', 'Advanced']);
      expect(savedDoc.answers.experience).toBe('Intermediate');
    });
  });

  describe('Database Read Operations', () => {
    beforeEach(async () => {
      // Create test data
      const testSubmissions = [
        {
          formId: 'form-1',
          questions: [{ id: 'q1', type: QuestionType.TEXT, title: 'Question 1' }],
          answers: { q1: 'Answer 1' },
          userEmail: 'user1@example.com',
          submittedAt: new Date('2024-01-01'),
        },
        {
          formId: 'form-1',
          questions: [{ id: 'q1', type: QuestionType.TEXT, title: 'Question 1' }],
          answers: { q1: 'Answer 2' },
          userEmail: 'user2@example.com',
          submittedAt: new Date('2024-01-02'),
        },
        {
          formId: 'form-2',
          questions: [{ id: 'q1', type: QuestionType.TEXT, title: 'Question 1' }],
          answers: { q1: 'Answer 3' },
          userEmail: 'user1@example.com',
          submittedAt: new Date('2024-01-03'),
        },
      ];

      await formSubmissionModel.insertMany(testSubmissions);
    });

    it('should retrieve all form submissions', async () => {
      const result = await service.getFormSubmissions();

      expect(result.submissions).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.submissions[0].submittedAt).toBeInstanceOf(Date);
    });

    it('should filter submissions by formId', async () => {
      const result = await service.getFormSubmissions('form-1');

      expect(result.submissions).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.submissions.every(s => s.formId === 'form-1')).toBe(true);
    });

    it('should filter submissions by userEmail', async () => {
      const result = await service.getFormSubmissions(undefined, 'user1@example.com');

      expect(result.submissions).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.submissions.every(s => s.userEmail === 'user1@example.com')).toBe(true);
    });

    it('should filter submissions by both formId and userEmail', async () => {
      const result = await service.getFormSubmissions('form-1', 'user1@example.com');

      expect(result.submissions).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.submissions[0].formId).toBe('form-1');
      expect(result.submissions[0].userEmail).toBe('user1@example.com');
    });

    it('should handle pagination correctly', async () => {
      const result = await service.getFormSubmissions(undefined, undefined, 2, 1);

      expect(result.submissions).toHaveLength(2);
      expect(result.total).toBe(3);
    });

    it('should retrieve form submission by ID', async () => {
      const allSubmissions = await service.getFormSubmissions();
      const firstSubmission = allSubmissions.submissions[0];

      const result = await service.getFormSubmissionById(firstSubmission._id.toString());

      expect(result).toBeTruthy();
      expect(result._id.toString()).toBe(firstSubmission._id.toString());
    });

    it('should return null for non-existent submission ID', async () => {
      const result = await service.getFormSubmissionById('507f1f77bcf86cd799439011');

      expect(result).toBeNull();
    });
  });

  describe('Database Statistics and Aggregation', () => {
    beforeEach(async () => {
      // Create test data with different dates
      const testSubmissions = [
        {
          formId: 'stats-form',
          questions: [
            { id: 'q1', type: QuestionType.TEXT, title: 'Question 1' },
            { id: 'q2', type: QuestionType.TEXT, title: 'Question 2' },
          ],
          answers: { q1: 'Answer 1', q2: 'Answer 2' },
          submittedAt: new Date('2024-01-01'),
        },
        {
          formId: 'stats-form',
          questions: [{ id: 'q1', type: QuestionType.TEXT, title: 'Question 1' }],
          answers: { q1: 'Answer 1' },
          submittedAt: new Date('2024-01-01'),
        },
        {
          formId: 'stats-form',
          questions: [
            { id: 'q1', type: QuestionType.TEXT, title: 'Question 1' },
            { id: 'q2', type: QuestionType.TEXT, title: 'Question 2' },
            { id: 'q3', type: QuestionType.TEXT, title: 'Question 3' },
          ],
          answers: { q1: 'Answer 1', q2: 'Answer 2', q3: 'Answer 3' },
          submittedAt: new Date('2024-01-02'),
        },
      ];

      await formSubmissionModel.insertMany(testSubmissions);
    });

    it('should calculate form statistics correctly', async () => {
      const result = await service.getFormStatistics('stats-form');

      expect(result.totalSubmissions).toBe(3);
      expect(result.submissionsByDate).toHaveLength(2);
      expect(result.submissionsByDate[0]).toMatchObject({
        date: '2024-01-01',
        count: 2,
      });
      expect(result.submissionsByDate[1]).toMatchObject({
        date: '2024-01-02',
        count: 1,
      });
      expect(result.averageQuestionsPerSubmission).toBe(2); // (2+1+3)/3 = 2
    });

    it('should calculate statistics for all forms when no formId provided', async () => {
      const result = await service.getFormStatistics();

      expect(result.totalSubmissions).toBe(3);
      expect(result.submissionsByDate).toHaveLength(2);
      expect(result.averageQuestionsPerSubmission).toBe(2);
    });
  });

  describe('Data Integrity and Edge Cases', () => {
    it('should handle special characters in form data', async () => {
      const submissionData: FormSubmissionDto = {
        questions: [
          {
            id: 'comment',
            type: QuestionType.TEXT,
            title: 'Your comment',
            required: true,
          },
        ],
        answers: {
          comment: 'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?',
        },
      };

      const result = await service.submitForm(submissionData);

      expect(result.success).toBe(true);

      const savedDoc = await formSubmissionModel.findById(result.submissionId);
      expect(savedDoc.answers.comment).toBe('Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?');
    });

    it('should handle unicode characters in form data', async () => {
      const submissionData: FormSubmissionDto = {
        questions: [
          {
            id: 'name',
            type: QuestionType.TEXT,
            title: 'Your name',
            required: true,
          },
        ],
        answers: {
          name: 'José María 中文 العربية',
        },
      };

      const result = await service.submitForm(submissionData);

      expect(result.success).toBe(true);

      const savedDoc = await formSubmissionModel.findById(result.submissionId);
      expect(savedDoc.answers.name).toBe('José María 中文 العربية');
    });

    it('should handle large form submissions', async () => {
      const largeQuestions = Array.from({ length: 20 }, (_, i) => ({
        id: `question_${i}`,
        type: QuestionType.TEXT,
        title: `Question ${i + 1}`,
        required: true,
      }));

      const largeAnswers = largeQuestions.reduce((acc, q) => {
        acc[q.id] = `Answer for question ${q.id}`;
        return acc;
      }, {} as Record<string, string>);

      const submissionData: FormSubmissionDto = {
        questions: largeQuestions,
        answers: largeAnswers,
      };

      const result = await service.submitForm(submissionData);

      expect(result.success).toBe(true);

      const savedDoc = await formSubmissionModel.findById(result.submissionId);
      expect(savedDoc.questions).toHaveLength(20);
      expect(Object.keys(savedDoc.answers)).toHaveLength(20);
    });

    it('should handle empty answers object', async () => {
      const submissionData: FormSubmissionDto = {
        questions: [
          {
            id: 'optional',
            type: QuestionType.TEXT,
            title: 'Optional question',
            required: false,
          },
        ],
        answers: {},
      };

      const result = await service.submitForm(submissionData);

      expect(result.success).toBe(true);

      const savedDoc = await formSubmissionModel.findById(result.submissionId);
      expect(savedDoc.answers).toEqual({});
    });
  });

  describe('Database Performance and Indexing', () => {
    it('should efficiently query by formId (indexed field)', async () => {
      // Create multiple submissions
      const submissions = Array.from({ length: 10 }, (_, i) => ({
        formId: i % 2 === 0 ? 'even-form' : 'odd-form',
        questions: [{ id: 'q1', type: QuestionType.TEXT, title: 'Question' }],
        answers: { q1: `Answer ${i}` },
        submittedAt: new Date(),
      }));

      await formSubmissionModel.insertMany(submissions);

      const startTime = Date.now();
      const result = await service.getFormSubmissions('even-form');
      const endTime = Date.now();

      expect(result.submissions).toHaveLength(5);
      expect(endTime - startTime).toBeLessThan(1000); // Should be fast due to indexing
    });

    it('should efficiently query by userEmail (indexed field)', async () => {
      const submissions = Array.from({ length: 10 }, (_, i) => ({
        formId: 'test-form',
        questions: [{ id: 'q1', type: QuestionType.TEXT, title: 'Question' }],
        answers: { q1: `Answer ${i}` },
        userEmail: i % 2 === 0 ? 'even@example.com' : 'odd@example.com',
        submittedAt: new Date(),
      }));

      await formSubmissionModel.insertMany(submissions);

      const startTime = Date.now();
      const result = await service.getFormSubmissions(undefined, 'even@example.com');
      const endTime = Date.now();

      expect(result.submissions).toHaveLength(5);
      expect(endTime - startTime).toBeLessThan(1000); // Should be fast due to indexing
    });
  });
});
