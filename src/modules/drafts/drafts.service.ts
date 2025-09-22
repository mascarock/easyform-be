import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DraftSubmission, DraftSubmissionDocument } from '../../common/schemas/draft-submission.schema';
import { SaveDraftDto, DraftSubmissionResponseDto, GetDraftResponseDto, DeleteDraftResponseDto, CleanupDraftsResponseDto } from '../../common/dto/draft-submission.dto';

@Injectable()
export class DraftsService {
  private readonly logger = new Logger(DraftsService.name);

  constructor(
    @InjectModel(DraftSubmission.name)
    private draftSubmissionModel: Model<DraftSubmissionDocument>,
  ) {}

  async saveDraft(
    saveDraftDto: SaveDraftDto,
    metadata: { userAgent?: string; ipAddress?: string }
  ): Promise<DraftSubmissionResponseDto> {
    try {
      const { sessionId, formId, answers, currentStep } = saveDraftDto;

      // Validate session ID format (basic security check)
      if (!sessionId || sessionId.length < 10) {
        throw new BadRequestException('Invalid session ID format');
      }

      // Calculate expiration time (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const now = new Date();

      // Upsert draft (update if exists, create if not)
      const draftSubmission = await this.draftSubmissionModel.findOneAndUpdate(
        { sessionId },
        {
          sessionId,
          formId,
          answers,
          currentStep,
          lastModified: now,
          expiresAt,
          userAgent: metadata.userAgent,
          ipAddress: metadata.ipAddress,
          metadata: {
            answerCount: Object.keys(answers).length,
            lastQuestionAnswered: this.getLastAnsweredQuestion(answers),
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
        }
      );

      this.logger.log(`Draft saved for session: ${sessionId}, step: ${currentStep}`);

      return {
        success: true,
        message: 'Draft saved successfully',
        draftId: draftSubmission._id.toString(),
        lastModified: draftSubmission.lastModified.toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to save draft: ${error.message}`, error.stack);

      if (error instanceof BadRequestException) {
        throw error;
      }

      return {
        success: false,
        message: 'Failed to save draft',
        errors: [error.message],
      };
    }
  }

  async getDraft(sessionId: string): Promise<GetDraftResponseDto | null> {
    try {
      // Validate session ID
      if (!sessionId || sessionId.length < 10) {
        throw new BadRequestException('Invalid session ID format');
      }

      const draft = await this.draftSubmissionModel.findOne({
        sessionId,
        expiresAt: { $gt: new Date() } // Only return non-expired drafts
      });

      if (!draft) {
        return null;
      }

      this.logger.log(`Draft retrieved for session: ${sessionId}`);

      return {
        sessionId: draft.sessionId,
        formId: draft.formId,
        answers: draft.answers,
        currentStep: draft.currentStep,
        lastModified: draft.lastModified.toISOString(),
        expiresAt: draft.expiresAt.toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to retrieve draft: ${error.message}`, error.stack);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new NotFoundException('Draft not found');
    }
  }

  async deleteDraft(sessionId: string): Promise<DeleteDraftResponseDto> {
    try {
      // Validate session ID
      if (!sessionId || sessionId.length < 10) {
        throw new BadRequestException('Invalid session ID format');
      }

      const result = await this.draftSubmissionModel.deleteOne({ sessionId });

      if (result.deletedCount === 0) {
        throw new NotFoundException('Draft not found');
      }

      this.logger.log(`Draft deleted for session: ${sessionId}`);

      return {
        success: true,
        message: 'Draft deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to delete draft: ${error.message}`, error.stack);

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      return {
        success: false,
        message: 'Failed to delete draft',
      };
    }
  }

  async cleanupExpiredDrafts(): Promise<CleanupDraftsResponseDto> {
    try {
      const result = await this.draftSubmissionModel.deleteMany({
        expiresAt: { $lt: new Date() }
      });

      this.logger.log(`Cleaned up ${result.deletedCount} expired drafts`);

      return {
        deletedCount: result.deletedCount,
        message: `Successfully cleaned up ${result.deletedCount} expired drafts`,
      };
    } catch (error) {
      this.logger.error(`Failed to cleanup expired drafts: ${error.message}`, error.stack);

      return {
        deletedCount: 0,
        message: 'Failed to cleanup expired drafts',
      };
    }
  }

  async getDraftStatistics(formId?: string) {
    try {
      const matchStage = formId ? { formId, expiresAt: { $gt: new Date() } } : { expiresAt: { $gt: new Date() } };

      const stats = await this.draftSubmissionModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalDrafts: { $sum: 1 },
            averageStep: { $avg: '$currentStep' },
            averageAnswers: { $avg: { $size: { $objectToArray: '$answers' } } },
            oldestDraft: { $min: '$lastModified' },
            newestDraft: { $max: '$lastModified' },
          },
        },
      ]);

      return stats[0] || {
        totalDrafts: 0,
        averageStep: 0,
        averageAnswers: 0,
        oldestDraft: null,
        newestDraft: null,
      };
    } catch (error) {
      this.logger.error(`Failed to get draft statistics: ${error.message}`, error.stack);
      throw error;
    }
  }

  private getLastAnsweredQuestion(answers: Record<string, any>): string | null {
    const answeredQuestions = Object.keys(answers).filter(key =>
      answers[key] !== undefined && answers[key] !== '' && answers[key] !== null
    );

    return answeredQuestions.length > 0 ? answeredQuestions[answeredQuestions.length - 1] : null;
  }
}