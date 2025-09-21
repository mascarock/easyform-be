import { Injectable, BadRequestException } from '@nestjs/common';
import { FormSubmissionDto } from '../dto/form-submission.dto';
import { QuestionType } from '../dto/question.dto';

@Injectable()
export class FormValidationService {
  private readonly MAX_QUESTIONNAIRE_LENGTH = 50;
  private readonly MAX_ANSWER_LENGTH = 1000;
  private readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  validateFormSubmission(submission: FormSubmissionDto): void {
    this.validateQuestions(submission.questions);
    this.validateAnswers(submission.answers, submission.questions);
    this.validateEmailIfPresent(submission.userEmail);
  }

  private validateQuestions(questions: any[]): void {
    if (!Array.isArray(questions)) {
      throw new BadRequestException('Questions must be an array');
    }

    if (questions.length === 0) {
      throw new BadRequestException('At least one question is required');
    }

    if (questions.length > this.MAX_QUESTIONNAIRE_LENGTH) {
      throw new BadRequestException(`Maximum ${this.MAX_QUESTIONNAIRE_LENGTH} questions allowed`);
    }

    const questionIds = new Set<string>();
    
    for (const question of questions) {
      // Validate question structure
      if (!question.id || typeof question.id !== 'string') {
        throw new BadRequestException('Each question must have a valid id');
      }

      if (questionIds.has(question.id)) {
        throw new BadRequestException(`Duplicate question id: ${question.id}`);
      }
      questionIds.add(question.id);

      if (!Object.values(QuestionType).includes(question.type)) {
        throw new BadRequestException(`Invalid question type: ${question.type}`);
      }

      if (!question.title || typeof question.title !== 'string') {
        throw new BadRequestException('Each question must have a title');
      }

      // Validate multiple choice questions have options
      if (question.type === QuestionType.MULTIPLE_CHOICE) {
        if (!question.options || !Array.isArray(question.options) || question.options.length === 0) {
          throw new BadRequestException('Multiple choice questions must have options');
        }
      }
    }
  }

  private validateAnswers(answers: Record<string, any>, questions: any[]): void {
    if (!answers || typeof answers !== 'object') {
      throw new BadRequestException('Answers must be an object');
    }

    const questionMap = new Map(questions.map(q => [q.id, q]));

    for (const [questionId, answer] of Object.entries(answers)) {
      const question = questionMap.get(questionId);
      
      if (!question) {
        throw new BadRequestException(`Answer provided for unknown question: ${questionId}`);
      }

      // Check if required question has answer
      if (question.required && (answer === undefined || answer === null || answer === '')) {
        throw new BadRequestException(`Required question '${question.title}' must be answered`);
      }

      // Skip validation for empty optional answers
      if (answer === undefined || answer === null || answer === '') {
        continue;
      }

      // Validate answer based on question type
      this.validateAnswerByType(question, answer);
    }

    // Check that all required questions are answered
    for (const question of questions) {
      if (question.required && !(question.id in answers)) {
        throw new BadRequestException(`Required question '${question.title}' is missing`);
      }
    }
  }

  private validateAnswerByType(question: any, answer: any): void {
    switch (question.type) {
      case QuestionType.TEXT:
        if (typeof answer !== 'string') {
          throw new BadRequestException(`Answer for '${question.title}' must be a string`);
        }
        if (answer.length > this.MAX_ANSWER_LENGTH) {
          throw new BadRequestException(`Answer for '${question.title}' is too long`);
        }
        break;

      case QuestionType.EMAIL:
        if (typeof answer !== 'string') {
          throw new BadRequestException(`Answer for '${question.title}' must be a string`);
        }
        if (!this.EMAIL_REGEX.test(answer)) {
          throw new BadRequestException(`Answer for '${question.title}' must be a valid email`);
        }
        break;

      case QuestionType.MULTIPLE_CHOICE:
        if (typeof answer !== 'string') {
          throw new BadRequestException(`Answer for '${question.title}' must be a string`);
        }
        if (!question.options.includes(answer)) {
          throw new BadRequestException(`Answer for '${question.title}' must be one of the provided options`);
        }
        break;

      default:
        throw new BadRequestException(`Unknown question type: ${question.type}`);
    }
  }

  private validateEmailIfPresent(email?: string): void {
    if (email && !this.EMAIL_REGEX.test(email)) {
      throw new BadRequestException('Invalid email format');
    }
  }

  sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      // Remove potentially dangerous characters and trim
      return input.trim().replace(/[<>]/g, '');
    }
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    return input;
  }
}
