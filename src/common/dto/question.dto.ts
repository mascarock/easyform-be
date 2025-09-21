import { IsString, IsEnum, IsOptional, IsBoolean, IsArray, MaxLength } from 'class-validator';

export enum QuestionType {
  TEXT = 'text',
  EMAIL = 'email',
  MULTIPLE_CHOICE = 'multiple-choice',
}

export class QuestionDto {
  @IsString()
  @MaxLength(100)
  id: string;

  @IsEnum(QuestionType)
  type: QuestionType;

  @IsString()
  @MaxLength(500)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  placeholder?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  options?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(300)
  helperText?: string;
}
