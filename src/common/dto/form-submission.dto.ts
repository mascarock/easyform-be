import { IsObject, IsString, IsOptional, IsEmail, IsDateString, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionDto } from './question.dto';

export class FormSubmissionDto {
  @IsString()
  @IsOptional()
  formId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions: QuestionDto[];

  @IsObject()
  answers: Record<string, any>;

  @IsOptional()
  @IsString()
  @IsEmail()
  userEmail?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsDateString()
  submittedAt?: string;
}

export class FormSubmissionResponseDto {
  success: boolean;
  message: string;
  submissionId?: string;
  errors?: string[];
}
