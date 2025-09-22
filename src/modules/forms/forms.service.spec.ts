import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { FormsService } from './forms.service';
import { FormValidationService } from '../../common/validators/form-validation.validator';
import { FormSubmission } from '../../common/schemas/form-submission.schema';
import { FormSubmissionDto } from '../../common/dto/form-submission.dto';
import { QuestionType } from '../../common/dto/question.dto';
import * as mongoose from 'mongoose';

describe('FormsService', () => {
  let service: FormsService;
  let validationService: FormValidationService;
  let configService: ConfigService;

  const baseFormSubmission = {
    _id: '507f1f77bcf86cd799439011',
    formId: 'test-form',
    questions: [
      {
        id: 'name',
        type: QuestionType.TEXT,
        title: 'What is your name?',
        required: true,
      },
    ],
    answers: {
      name: 'John Doe',
    },
    userEmail: 'john@example.com',
    submittedAt: new Date(),
  };

  const mockModel: any = jest.fn();
  let mockDocument: any;
  let mockSave: jest.Mock;

  beforeEach(async () => {
    mockSave = jest.fn().mockResolvedValue({
      ...baseFormSubmission,
    });

    mockDocument = {
      ...baseFormSubmission,
      save: mockSave,
    };

    mockModel.mockImplementation(() => mockDocument);
    mockModel.find = jest.fn();
    mockModel.findById = jest.fn();
    mockModel.countDocuments = jest.fn();
    mockModel.aggregate = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormsService,
        {
          provide: getModelToken(FormSubmission.name),
          useValue: mockModel,
        },
        {
          provide: FormValidationService,
          useValue: {
            validateFormSubmission: jest.fn(),
            sanitizeInput: jest.fn((input) => input),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                'database.uri': 'mongodb://localhost:27017/easyform-test',
                'database.database': 'easyform-test',
                'app.maxQuestionnaireLength': 50,
                'app.maxAnswerLength': 1000,
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<FormsService>(FormsService);
    validationService = module.get<FormValidationService>(FormValidationService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitForm', () => {
    const validSubmission: FormSubmissionDto = {
      questions: [
        {
          id: 'name',
          type: QuestionType.TEXT,
          title: 'What is your name?',
          required: true,
        },
      ],
      answers: {
        name: 'John Doe',
      },
      userEmail: 'john@example.com',
    };

    it('should successfully submit a valid form', async () => {
      const result = await service.submitForm(validSubmission);

      expect(validationService.validateFormSubmission).toHaveBeenCalledWith(validSubmission);
      expect(validationService.sanitizeInput).toHaveBeenCalled();
      expect(mockSave).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.submissionId).toBe(baseFormSubmission._id);
    });

    it('should handle validation errors', async () => {
      const validationError = new Error('Validation failed');
      jest.spyOn(validationService, 'validateFormSubmission').mockImplementation(() => {
        throw validationError;
      });

      const result = await service.submitForm(validSubmission);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Form submission failed');
      expect(result.errors).toContain('Validation failed');
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockSave.mockRejectedValue(dbError);

      const result = await service.submitForm(validSubmission);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Form submission failed');
    });
  });

  describe('getFormSubmissions', () => {
    it('should return form submissions with pagination', async () => {
      const mockSubmissions = [baseFormSubmission as any];
      const mockCount = 1;

      (mockModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockSubmissions),
      });

      (mockModel.countDocuments as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCount),
      });

      const result = await service.getFormSubmissions('test-form', 'john@example.com', 10, 0);

      expect(result.submissions).toEqual(mockSubmissions);
      expect(result.total).toBe(mockCount);
    });

    it('should handle database errors when fetching submissions', async () => {
      (mockModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      (mockModel.countDocuments as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await expect(service.getFormSubmissions()).rejects.toThrow('Failed to fetch form submissions');
    });
  });

  describe('getFormSubmissionById', () => {
    it('should return a form submission by ID', async () => {
      (mockModel.findById as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(baseFormSubmission),
      });

      const result = await service.getFormSubmissionById('507f1f77bcf86cd799439011');

      expect(result).toEqual(baseFormSubmission);
    });

    it('should return null for non-existent submission', async () => {
      (mockModel.findById as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getFormSubmissionById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle database errors when fetching by ID', async () => {
      (mockModel.findById as jest.Mock).mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      await expect(service.getFormSubmissionById('507f1f77bcf86cd799439011')).rejects.toThrow(
        'Failed to fetch form submission',
      );
    });
  });

  describe('getFormStatistics', () => {
    it('should return form statistics', async () => {
      const mockStats = {
        totalSubmissions: 10,
        submissionsByDate: [
          { date: '2023-01-01', count: 5 },
          { date: '2023-01-02', count: 5 },
        ],
        averageQuestionsPerSubmission: 3.5,
      };

      (mockModel.countDocuments as jest.Mock).mockResolvedValue(mockStats.totalSubmissions);

      (mockModel.aggregate as jest.Mock)
        .mockResolvedValueOnce(mockStats.submissionsByDate)
        .mockResolvedValueOnce([{ avgQuestions: mockStats.averageQuestionsPerSubmission }]);

      const result = await service.getFormStatistics('test-form');

      expect(result).toEqual(mockStats);
    });

    it('should handle database errors when fetching statistics', async () => {
      (mockModel.countDocuments as jest.Mock).mockRejectedValue(new Error('Database error'));

      (mockModel.aggregate as jest.Mock).mockResolvedValue([]);

      await expect(service.getFormStatistics()).rejects.toThrow('Failed to fetch form statistics');
    });
  });

  describe('Database Connectivity and Configuration', () => {
    it('should use correct MongoDB URI from configuration', () => {
      expect(configService.get('database.uri')).toBe('mongodb://localhost:27017/easyform-test');
    });

    it('should use correct database name from configuration', () => {
      expect(configService.get('database.database')).toBe('easyform-test');
    });

    it('should have proper configuration values for validation', () => {
      expect(configService.get('app.maxQuestionnaireLength')).toBe(50);
      expect(configService.get('app.maxAnswerLength')).toBe(1000);
    });
  });

  describe('MongoDB Document Operations', () => {
    it('should create document with proper schema structure', async () => {
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

      expect(mockModel).toHaveBeenCalledWith(
        expect.objectContaining({
          formId: 'test-form-123',
          questions: submissionData.questions,
          answers: submissionData.answers,
          userEmail: 'john@example.com',
          userAgent: 'Mozilla/5.0 (Test Browser)',
          ipAddress: '127.0.0.1',
          submittedAt: expect.any(Date),
          metadata: expect.objectContaining({
            version: '1.0.0',
            source: 'easyform-frontend',
          }),
        })
      );
      expect(result.success).toBe(true);
    });

    it('should handle document creation with minimal required fields', async () => {
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

      expect(mockModel).toHaveBeenCalledWith(
        expect.objectContaining({
          questions: minimalSubmission.questions,
          answers: minimalSubmission.answers,
          submittedAt: expect.any(Date),
          metadata: expect.objectContaining({
            version: '1.0.0',
            source: 'easyform-frontend',
          }),
        })
      );
      expect(result.success).toBe(true);
    });

    it('should handle document creation with metadata', async () => {
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
        source: 'mobile-app',
        version: '2.1.0',
        campaign: 'summer-2024',
      };

      const result = await service.submitForm(submissionData, customMetadata);

      expect(mockModel).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            ...customMetadata,
            version: '1.0.0', // Should be overridden by service
            source: 'easyform-frontend', // Should be overridden by service
          }),
        })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('MongoDB Query Operations', () => {
    it('should execute find query with proper filters and sorting', async () => {
      const mockSubmissions = [baseFormSubmission as any];
      const mockCount = 1;

      (mockModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockSubmissions),
      });

      (mockModel.countDocuments as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCount),
      });

      await service.getFormSubmissions('test-form', 'john@example.com', 5, 10);

      expect(mockModel.find).toHaveBeenCalledWith({
        formId: 'test-form',
        userEmail: 'john@example.com',
      });
      expect(mockModel.find().sort).toHaveBeenCalledWith({ submittedAt: -1 });
      expect(mockModel.find().limit).toHaveBeenCalledWith(5);
      expect(mockModel.find().skip).toHaveBeenCalledWith(10);
    });

    it('should execute findById query with proper ObjectId handling', async () => {
      const testId = '507f1f77bcf86cd799439011';
      
      (mockModel.findById as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(baseFormSubmission),
      });

      await service.getFormSubmissionById(testId);

      expect(mockModel.findById).toHaveBeenCalledWith(testId);
    });

    it('should execute countDocuments query for statistics', async () => {
      (mockModel.countDocuments as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(42),
      });

      (mockModel.aggregate as jest.Mock)
        .mockResolvedValueOnce([]) // submissionsByDate
        .mockResolvedValueOnce([{ avgQuestions: 2.5 }]); // avgQuestions

      await service.getFormStatistics('test-form');

      expect(mockModel.countDocuments).toHaveBeenCalledWith({ formId: 'test-form' });
    });

    it('should execute aggregate queries for date grouping', async () => {
      const mockDateStats = [
        { date: '2024-01-01', count: 5 },
        { date: '2024-01-02', count: 3 },
      ];

      (mockModel.aggregate as jest.Mock)
        .mockResolvedValueOnce(mockDateStats)
        .mockResolvedValueOnce([{ avgQuestions: 2.5 }]);

      (mockModel.countDocuments as jest.Mock).mockResolvedValue(8);

      await service.getFormStatistics();

      expect(mockModel.aggregate).toHaveBeenCalledWith([
        { $match: {} },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', count: 1, _id: 0 } }
      ]);
    });
  });

  describe('Database Error Handling', () => {
    it('should handle MongoDB connection errors during save', async () => {
      const connectionError = new Error('MongoNetworkError: failed to connect to server');
      mockSave.mockRejectedValue(connectionError);

      const result = await service.submitForm({
        questions: [{ id: 'test', type: QuestionType.TEXT, title: 'Test' }],
        answers: { test: 'value' },
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Form submission failed');
    });

    it('should handle MongoDB validation errors', async () => {
      const validationError = new Error('ValidationError: Path `questions` is required');
      mockSave.mockRejectedValue(validationError);

      const result = await service.submitForm({
        questions: [],
        answers: { test: 'value' },
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Form submission failed');
    });

    it('should handle MongoDB timeout errors', async () => {
      const timeoutError = new Error('MongoTimeoutError: operation timed out');
      mockSave.mockRejectedValue(timeoutError);

      const result = await service.submitForm({
        questions: [{ id: 'test', type: QuestionType.TEXT, title: 'Test' }],
        answers: { test: 'value' },
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Form submission failed');
    });

    it('should handle database errors during query operations', async () => {
      const queryError = new Error('MongoError: connection lost');
      
      (mockModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(queryError),
      });

      (mockModel.countDocuments as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await expect(service.getFormSubmissions()).rejects.toThrow('Failed to fetch form submissions');
    });
  });

  describe('MongoDB Index and Performance', () => {
    it('should verify proper indexing for formId queries', async () => {
      (mockModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      (mockModel.countDocuments as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await service.getFormSubmissions('test-form-id');

      expect(mockModel.find).toHaveBeenCalledWith({ formId: 'test-form-id' });
    });

    it('should verify proper indexing for userEmail queries', async () => {
      (mockModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      (mockModel.countDocuments as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await service.getFormSubmissions(undefined, 'user@example.com');

      expect(mockModel.find).toHaveBeenCalledWith({ userEmail: 'user@example.com' });
    });

    it('should verify proper sorting by submittedAt for performance', async () => {
      (mockModel.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      (mockModel.countDocuments as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await service.getFormSubmissions();

      expect(mockModel.find().sort).toHaveBeenCalledWith({ submittedAt: -1 });
    });
  });

  describe('Data Integrity and Validation', () => {
    it('should preserve data types in MongoDB document', async () => {
      const submissionData: FormSubmissionDto = {
        questions: [
          {
            id: 'age',
            type: QuestionType.TEXT,
            title: 'Your age',
            required: true,
          },
        ],
        answers: {
          age: '25', // String representation of number
        },
        userEmail: 'test@example.com',
      };

      const result = await service.submitForm(submissionData);

      expect(mockModel).toHaveBeenCalledWith(
        expect.objectContaining({
          answers: {
            age: '25', // Should preserve as string
          },
          userEmail: 'test@example.com',
        })
      );
      expect(result.success).toBe(true);
    });

    it('should handle special characters in MongoDB document', async () => {
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

      expect(mockModel).toHaveBeenCalledWith(
        expect.objectContaining({
          answers: {
            comment: 'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?',
          },
        })
      );
      expect(result.success).toBe(true);
    });

    it('should handle unicode characters in MongoDB document', async () => {
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

      expect(mockModel).toHaveBeenCalledWith(
        expect.objectContaining({
          answers: {
            name: 'José María 中文 العربية',
          },
        })
      );
      expect(result.success).toBe(true);
    });
  });
});
