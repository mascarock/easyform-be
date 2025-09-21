import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FormSubmission, FormSubmissionDocument } from '../../common/schemas/form-submission.schema';
import { FormSubmissionDto, FormSubmissionResponseDto } from '../../common/dto/form-submission.dto';
import { FormValidationService } from '../../common/validators/form-validation.validator';

@Injectable()
export class FormsService {
  private readonly logger = new Logger(FormsService.name);

  constructor(
    @InjectModel(FormSubmission.name) 
    private formSubmissionModel: Model<FormSubmissionDocument>,
    private formValidationService: FormValidationService,
  ) {}

  async submitForm(submissionData: FormSubmissionDto, metadata?: any): Promise<FormSubmissionResponseDto> {
    try {
      // Validate the form submission
      this.formValidationService.validateFormSubmission(submissionData);

      // Sanitize inputs
      const sanitizedData = {
        ...submissionData,
        questions: submissionData.questions.map(q => this.formValidationService.sanitizeInput(q)),
        answers: this.formValidationService.sanitizeInput(submissionData.answers),
      };

      // Create form submission document
      const formSubmission = new this.formSubmissionModel({
        ...sanitizedData,
        submittedAt: new Date(),
        metadata: {
          ...metadata,
          version: '1.0.0',
          source: 'easyform-frontend',
        },
      });

      // Save to database
      const savedSubmission = await formSubmission.save();

      this.logger.log(`Form submission saved with ID: ${savedSubmission._id}`);

      return {
        success: true,
        message: 'Form submitted successfully',
        submissionId: savedSubmission._id.toString(),
      };
    } catch (error) {
      this.logger.error('Error submitting form:', error);
      
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
