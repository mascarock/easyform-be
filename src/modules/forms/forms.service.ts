import { Injectable, Logger, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FormSubmission, FormSubmissionDocument } from '../../common/schemas/form-submission.schema';
import { DraftSubmission, DraftSubmissionDocument } from '../../common/schemas/draft-submission.schema';
import { FormSubmissionDto, FormSubmissionResponseDto } from '../../common/dto/form-submission.dto';
import { FormValidationService } from '../../common/validators/form-validation.validator';

@Injectable()
export class FormsService {
  private readonly logger = new Logger(FormsService.name);

  constructor(
    @InjectModel(FormSubmission.name)
    private formSubmissionModel: Model<FormSubmissionDocument>,
    @InjectModel(DraftSubmission.name)
    private draftSubmissionModel: Model<DraftSubmissionDocument>,
    private formValidationService: FormValidationService,
  ) {}

  async submitForm(submissionData: FormSubmissionDto, metadata?: any): Promise<FormSubmissionResponseDto> {
    try {
      // Validate the form submission
      this.formValidationService.validateFormSubmission(submissionData);

      // Check for submission protection if sessionId is provided
      if (submissionData.sessionId) {
        await this.checkSubmissionProtection(submissionData.sessionId, metadata?.ipAddress);
      }

      // Sanitize inputs
      const sanitizedData = {
        ...submissionData,
        questions: submissionData.questions.map(q => this.formValidationService.sanitizeInput(q)),
        answers: this.formValidationService.sanitizeInput(submissionData.answers),
      };

      const now = new Date();

      // Create form submission document with protection fields
      const formSubmission = new this.formSubmissionModel({
        ...sanitizedData,
        submittedAt: now,
        sessionId: submissionData.sessionId,
        isDraft: false,
        draftSessionId: submissionData.convertFromDraft ? submissionData.sessionId : undefined,
        submissionAttempts: 1,
        lastSubmissionAttempt: now,
        metadata: {
          ...metadata,
          version: '1.0.0',
          source: 'easyform-frontend',
          convertedFromDraft: !!submissionData.convertFromDraft,
        },
      });

      // Save to database
      const savedSubmission = await formSubmission.save();

      // If converting from draft, clean up the draft
      if (submissionData.convertFromDraft && submissionData.sessionId) {
        await this.cleanupConvertedDraft(submissionData.sessionId);
      }

      this.logger.log(`Form submission saved with ID: ${savedSubmission._id}${submissionData.convertFromDraft ? ' (converted from draft)' : ''}`);

      return {
        success: true,
        message: 'Form submitted successfully',
        submissionId: savedSubmission._id.toString(),
      };
    } catch (error) {
      this.logger.error('Error submitting form:', error);

      if (error instanceof BadRequestException || error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error) {
        return {
          success: false,
          message: 'Form submission failed',
          errors: [error.message],
        };
      }

      return {
        success: false,
        message: 'Form submission failed',
        errors: ['An unexpected error occurred'],
      };
    }
  }

  private async checkSubmissionProtection(sessionId: string, ipAddress?: string): Promise<void> {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Check for recent submission attempts with same session ID
    const recentSubmissions = await this.formSubmissionModel.find({
      sessionId: sessionId,
      lastSubmissionAttempt: { $gte: fiveMinutesAgo }
    }).sort({ lastSubmissionAttempt: -1 });

    if (recentSubmissions.length > 0) {
      const lastSubmission = recentSubmissions[0];
      const timeSinceLastAttempt = now.getTime() - lastSubmission.lastSubmissionAttempt.getTime();

      // Prevent submissions within 30 seconds of each other
      if (timeSinceLastAttempt < 30000) {
        this.logger.warn(`Blocked rapid submission attempt for session: ${sessionId}`);
        throw new HttpException('Please wait before submitting again', HttpStatus.TOO_MANY_REQUESTS);
      }

      // If more than 3 attempts in 5 minutes, require longer wait
      if (recentSubmissions.length >= 3) {
        this.logger.warn(`Blocked excessive submission attempts for session: ${sessionId}`);
        throw new HttpException('Too many submission attempts. Please wait 5 minutes before trying again', HttpStatus.TOO_MANY_REQUESTS);
      }

      // Update attempt count for existing submission
      await this.formSubmissionModel.updateOne(
        { _id: lastSubmission._id },
        {
          $inc: { submissionAttempts: 1 },
          $set: { lastSubmissionAttempt: now }
        }
      );
    }

    // Additional IP-based rate limiting
    if (ipAddress) {
      const recentIpSubmissions = await this.formSubmissionModel.countDocuments({
        'metadata.ipAddress': ipAddress,
        lastSubmissionAttempt: { $gte: fiveMinutesAgo }
      });

      if (recentIpSubmissions >= 10) {
        this.logger.warn(`Blocked excessive submissions from IP: ${ipAddress}`);
        throw new HttpException('Too many submissions from this IP address', HttpStatus.TOO_MANY_REQUESTS);
      }
    }
  }

  private async cleanupConvertedDraft(sessionId: string): Promise<void> {
    try {
      await this.draftSubmissionModel.deleteOne({ sessionId });
      this.logger.log(`Cleaned up draft for converted session: ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to cleanup draft for session ${sessionId}:`, error);
      // Don't throw error here as the main submission succeeded
    }
  }

  async getFormSubmissions(
    formId?: string,
    userEmail?: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<{ submissions: FormSubmissionDocument[]; total: number }> {
    try {
      const filter: any = {};
      
      if (formId) {
        filter.formId = formId;
      }
      
      if (userEmail) {
        filter.userEmail = userEmail;
      }

      const [submissions, total] = await Promise.all([
        this.formSubmissionModel
          .find(filter)
          .sort({ submittedAt: -1 })
          .limit(limit)
          .skip(offset)
          .exec(),
        this.formSubmissionModel.countDocuments(filter).exec(),
      ]);

      return { submissions, total };
    } catch (error) {
      this.logger.error('Error fetching form submissions:', error);
      throw new Error('Failed to fetch form submissions');
    }
  }

  async getFormSubmissionById(id: string): Promise<FormSubmissionDocument | null> {
    try {
      return await this.formSubmissionModel.findById(id).exec();
    } catch (error) {
      this.logger.error(`Error fetching form submission ${id}:`, error);
      throw new Error('Failed to fetch form submission');
    }
  }

  async getFormStatistics(formId?: string): Promise<{
    totalSubmissions: number;
    submissionsByDate: Array<{ date: string; count: number }>;
    averageQuestionsPerSubmission: number;
  }> {
    try {
      const filter = formId ? { formId } : {};

      const totalSubmissions = await this.formSubmissionModel.countDocuments(filter);

      // Get submissions grouped by date
      const submissionsByDate = await this.formSubmissionModel.aggregate([
        { $match: filter },
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

      // Calculate average questions per submission
      const avgQuestionsResult = await this.formSubmissionModel.aggregate([
        { $match: filter },
        { $group: { _id: null, avgQuestions: { $avg: { $size: '$questions' } } } }
      ]);

      const averageQuestionsPerSubmission = avgQuestionsResult[0]?.avgQuestions || 0;

      return {
        totalSubmissions,
        submissionsByDate,
        averageQuestionsPerSubmission: Math.round(averageQuestionsPerSubmission * 100) / 100,
      };
    } catch (error) {
      this.logger.error('Error fetching form statistics:', error);
      throw new Error('Failed to fetch form statistics');
    }
  }
}
