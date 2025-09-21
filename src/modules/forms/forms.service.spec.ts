import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FormsService } from './forms.service';
import { FormValidationService } from '../../common/validators/form-validation.validator';
import { FormSubmission, FormSubmissionDocument } from '../../common/schemas/form-submission.schema';
import { FormSubmissionDto } from '../../common/dto/form-submission.dto';
import { QuestionType } from '../../common/dto/question.dto';

describe('FormsService', () => {
  let service: FormsService;
  let model: Model<FormSubmissionDocument>;
  let validationService: FormValidationService;

  const mockFormSubmission = {
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
    save: jest.fn(),
  };

  const mockModel = {
    new: jest.fn().mockReturnValue(mockFormSubmission),
    constructor: jest.fn().mockImplementation(() => mockFormSubmission),
    find: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  } as any;

  beforeEach(async () => {
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
      ],
    }).compile();

    service = module.get<FormsService>(FormsService);
    model = module.get<Model<FormSubmissionDocument>>(getModelToken(FormSubmission.name));
    validationService = module.get<FormValidationService>(FormValidationService);
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
      // Mock the model constructor
      (model as any).mockImplementation(() => mockFormSubmission);
      
      const result = await service.submitForm(validSubmission);

      expect(validationService.validateFormSubmission).toHaveBeenCalledWith(validSubmission);
      expect(validationService.sanitizeInput).toHaveBeenCalled();
      expect(mockFormSubmission.save).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.submissionId).toBe(mockFormSubmission._id);
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
      mockFormSubmission.save.mockRejectedValue(dbError);

      const result = await service.submitForm(validSubmission);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Form submission failed');
    });
  });

  describe('getFormSubmissions', () => {
    it('should return form submissions with pagination', async () => {
      const mockSubmissions = [mockFormSubmission];
      const mockCount = 1;

      jest.spyOn(model, 'find').mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockSubmissions),
      } as any);

      jest.spyOn(model, 'countDocuments').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCount),
      } as any);

      const result = await service.getFormSubmissions('test-form', 'john@example.com', 10, 0);

      expect(result.submissions).toEqual(mockSubmissions);
      expect(result.total).toBe(mockCount);
    });

    it('should handle database errors when fetching submissions', async () => {
      jest.spyOn(model, 'find').mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      } as any);

      await expect(service.getFormSubmissions()).rejects.toThrow('Failed to fetch form submissions');
    });
  });

  describe('getFormSubmissionById', () => {
    it('should return a form submission by ID', async () => {
      jest.spyOn(model, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockFormSubmission),
      } as any);

      const result = await service.getFormSubmissionById('507f1f77bcf86cd799439011');

      expect(result).toEqual(mockFormSubmission);
    });

    it('should return null for non-existent submission', async () => {
      jest.spyOn(model, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await service.getFormSubmissionById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle database errors when fetching by ID', async () => {
      jest.spyOn(model, 'findById').mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      } as any);

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

      jest.spyOn(model, 'countDocuments').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockStats.totalSubmissions),
      } as any);

      // Mock aggregate calls - first call returns submissionsByDate, second returns avgQuestions
      jest.spyOn(model, 'aggregate')
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockStats.submissionsByDate)
        } as any)
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue([{ avgQuestions: mockStats.averageQuestionsPerSubmission }])
        } as any);

      const result = await service.getFormStatistics('test-form');

      expect(result).toEqual(mockStats);
    });

    it('should handle database errors when fetching statistics', async () => {
      jest.spyOn(model, 'countDocuments').mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('Database error')),
      } as any);

      await expect(service.getFormStatistics()).rejects.toThrow('Failed to fetch form statistics');
    });
  });
});
