import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FormValidationService } from './form-validation.validator';
import { QuestionType } from '../dto/question.dto';

describe('FormValidationService', () => {
  let service: FormValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FormValidationService],
    }).compile();

    service = module.get<FormValidationService>(FormValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateFormSubmission', () => {
    const validSubmission = {
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
    };

    it('should validate a correct form submission', () => {
      expect(() => service.validateFormSubmission(validSubmission)).not.toThrow();
    });

    it('should throw error for empty questions array', () => {
      const invalidSubmission = { ...validSubmission, questions: [] };
      expect(() => service.validateFormSubmission(invalidSubmission)).toThrow(
        BadRequestException,
      );
    });

    it('should throw error for too many questions', () => {
      const manyQuestions = Array(51).fill(validSubmission.questions[0]);
      const invalidSubmission = { ...validSubmission, questions: manyQuestions };
      expect(() => service.validateFormSubmission(invalidSubmission)).toThrow(
        BadRequestException,
      );
    });

    it('should throw error for duplicate question IDs', () => {
      const duplicateQuestions = [
        { ...validSubmission.questions[0], id: 'duplicate' },
        { ...validSubmission.questions[1], id: 'duplicate' },
      ];
      const invalidSubmission = { ...validSubmission, questions: duplicateQuestions };
      expect(() => service.validateFormSubmission(invalidSubmission)).toThrow(
        BadRequestException,
      );
    });

    it('should throw error for invalid question type', () => {
      const invalidQuestion = { ...validSubmission.questions[0], type: 'invalid' as any };
      const invalidSubmission = { ...validSubmission, questions: [invalidQuestion] };
      expect(() => service.validateFormSubmission(invalidSubmission)).toThrow(
        BadRequestException,
      );
    });

    it('should throw error for missing required answer', () => {
      const invalidAnswers = { name: 'John Doe' }; // Missing required email and experience
      const invalidSubmission = { ...validSubmission, answers: invalidAnswers };
      expect(() => service.validateFormSubmission(invalidSubmission)).toThrow(
        BadRequestException,
      );
    });

    it('should throw error for invalid email format', () => {
      const invalidAnswers = { ...validSubmission.answers, email: 'invalid-email' };
      const invalidSubmission = { ...validSubmission, answers: invalidAnswers };
      expect(() => service.validateFormSubmission(invalidSubmission)).toThrow(
        BadRequestException,
      );
    });

    it('should throw error for invalid multiple choice answer', () => {
      const invalidAnswers = { ...validSubmission.answers, experience: 'Invalid Option' };
      const invalidSubmission = { ...validSubmission, answers: invalidAnswers };
      expect(() => service.validateFormSubmission(invalidSubmission)).toThrow(
        BadRequestException,
      );
    });

    it('should throw error for answer to unknown question', () => {
      const invalidAnswers = { ...validSubmission.answers, unknownQuestion: 'answer' };
      const invalidSubmission = { ...validSubmission, answers: invalidAnswers };
      expect(() => service.validateFormSubmission(invalidSubmission)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize string input', () => {
      const input = '  <script>alert("xss")</script>  ';
      const result = service.sanitizeInput(input);
      expect(result).toBe('scriptalert("xss")/script');
    });

    it('should sanitize object input', () => {
      const input = {
        name: '  <b>John</b>  ',
        email: 'john@example.com',
        nested: {
          value: '  <script>alert("xss")</script>  ',
        },
      };
      const result = service.sanitizeInput(input);
      expect(result).toEqual({
        name: 'bJohn/b',
        email: 'john@example.com',
        nested: {
          value: 'scriptalert("xss")/script',
        },
      });
    });

    it('should handle non-string input', () => {
      expect(service.sanitizeInput(123)).toBe(123);
      expect(service.sanitizeInput(null)).toBe(null);
      expect(service.sanitizeInput(undefined)).toBe(undefined);
    });
  });
});
