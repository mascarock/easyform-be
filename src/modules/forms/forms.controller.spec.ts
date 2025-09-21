import { Test, TestingModule } from '@nestjs/testing';
import { FormsController } from './forms.controller';
import { FormsService } from './forms.service';
import { FormSubmissionDto } from '../../common/dto/form-submission.dto';
import { QuestionType } from '../../common/dto/question.dto';
import { ThrottlerModule } from '@nestjs/throttler';

describe('FormsController', () => {
  let controller: FormsController;
  let service: FormsService;

  const mockRequest = {
    get: jest.fn(),
    ip: '127.0.0.1',
    connection: { remoteAddress: '127.0.0.1' },
  } as any;

  const mockFormSubmission: FormSubmissionDto = {
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

  const mockServiceResponse = {
    success: true,
    message: 'Form submitted successfully',
    submissionId: '507f1f77bcf86cd799439011',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot()],
      controllers: [FormsController],
      providers: [
        {
          provide: FormsService,
          useValue: {
            submitForm: jest.fn(),
            getFormSubmissions: jest.fn(),
            getFormSubmissionById: jest.fn(),
            getFormStatistics: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<FormsController>(FormsController);
    service = module.get<FormsService>(FormsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('submitForm', () => {
    it('should submit a form successfully', async () => {
      jest.spyOn(service, 'submitForm').mockResolvedValue(mockServiceResponse);

      const result = await controller.submitForm(mockFormSubmission, mockRequest);

      expect(service.submitForm).toHaveBeenCalledWith(mockFormSubmission, {
        userAgent: undefined,
        ipAddress: '127.0.0.1',
        referer: undefined,
        origin: undefined,
      });
      expect(result).toEqual(mockServiceResponse);
    });

    it('should extract metadata from request', async () => {
      const requestWithMetadata = {
        ...mockRequest,
        get: jest.fn((header) => {
          const headers = {
            'User-Agent': 'Mozilla/5.0',
            'Referer': 'https://example.com',
            'Origin': 'https://example.com',
          };
          return headers[header];
        }),
        ip: '192.168.1.1',
      };

      jest.spyOn(service, 'submitForm').mockResolvedValue(mockServiceResponse);

      await controller.submitForm(mockFormSubmission, requestWithMetadata);

      expect(service.submitForm).toHaveBeenCalledWith(mockFormSubmission, {
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
        referer: 'https://example.com',
        origin: 'https://example.com',
      });
    });
  });

  describe('getFormSubmissions', () => {
    it('should get form submissions with default pagination', async () => {
      const mockSubmissions = {
        submissions: [mockFormSubmission as any],
        total: 1,
      };

      jest.spyOn(service, 'getFormSubmissions').mockResolvedValue(mockSubmissions);

      const result = await controller.getFormSubmissions();

      expect(service.getFormSubmissions).toHaveBeenCalledWith(undefined, undefined, 10, 0);
      expect(result).toEqual(mockSubmissions);
    });

    it('should get form submissions with custom parameters', async () => {
      const mockSubmissions = {
        submissions: [mockFormSubmission as any],
        total: 1,
      };

      jest.spyOn(service, 'getFormSubmissions').mockResolvedValue(mockSubmissions);

      const result = await controller.getFormSubmissions('test-form', 'john@example.com', '5', '10');

      expect(service.getFormSubmissions).toHaveBeenCalledWith('test-form', 'john@example.com', 5, 10);
      expect(result).toEqual(mockSubmissions);
    });

    it('should throw error for invalid limit', async () => {
      await expect(controller.getFormSubmissions(undefined, undefined, '0')).rejects.toThrow(
        'Limit must be between 1 and 100',
      );
    });

    it('should throw error for invalid offset', async () => {
      await expect(controller.getFormSubmissions(undefined, undefined, '10', '-1')).rejects.toThrow(
        'Offset must be non-negative',
      );
    });
  });

  describe('getFormSubmissionById', () => {
    it('should get form submission by ID', async () => {
      const mockSubmission = { ...mockFormSubmission, _id: '507f1f77bcf86cd799439011' };

      jest.spyOn(service, 'getFormSubmissionById').mockResolvedValue(mockSubmission as any);

      const result = await controller.getFormSubmissionById('507f1f77bcf86cd799439011');

      expect(service.getFormSubmissionById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toEqual(mockSubmission);
    });

    it('should throw error for non-existent submission', async () => {
      jest.spyOn(service, 'getFormSubmissionById').mockResolvedValue(null);

      await expect(controller.getFormSubmissionById('nonexistent')).rejects.toThrow(
        'Form submission not found',
      );
    });
  });

  describe('getFormStatistics', () => {
    it('should get form statistics', async () => {
      const mockStats = {
        totalSubmissions: 10,
        submissionsByDate: [
          { date: '2023-01-01', count: 5 },
          { date: '2023-01-02', count: 5 },
        ],
        averageQuestionsPerSubmission: 3.5,
      };

      jest.spyOn(service, 'getFormStatistics').mockResolvedValue(mockStats);

      const result = await controller.getFormStatistics('test-form');

      expect(service.getFormStatistics).toHaveBeenCalledWith('test-form');
      expect(result).toEqual(mockStats);
    });

    it('should get statistics for all forms when no formId provided', async () => {
      const mockStats = {
        totalSubmissions: 20,
        submissionsByDate: [],
        averageQuestionsPerSubmission: 3.0,
      };

      jest.spyOn(service, 'getFormStatistics').mockResolvedValue(mockStats);

      const result = await controller.getFormStatistics();

      expect(service.getFormStatistics).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockStats);
    });
  });
});
