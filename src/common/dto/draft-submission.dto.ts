import { IsObject, IsString, IsOptional, IsNumber, IsDateString, IsUUID } from 'class-validator';

export class SaveDraftDto {
  @IsString()
  sessionId: string;

  @IsString()
  @IsOptional()
  formId?: string;

  @IsObject()
  answers: Record<string, any>;

  @IsNumber()
  currentStep: number;

  @IsOptional()
  questions?: any[];
}

export class DraftSubmissionResponseDto {
  success: boolean;
  message: string;
  draftId?: string;
  lastModified?: string;
  errors?: string[];
}

export class GetDraftResponseDto {
  sessionId: string;
  formId?: string;
  answers: Record<string, any>;
  currentStep: number;
  lastModified: string;
  expiresAt: string;
}

export class GetDraftUnionResponseDto {
  success: boolean;
  message: string;
  draft: GetDraftResponseDto | null;
}

export class DeleteDraftResponseDto {
  success: boolean;
  message: string;
}

export class CleanupDraftsResponseDto {
  deletedCount: number;
  message: string;
}