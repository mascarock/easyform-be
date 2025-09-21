import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FormSubmissionDocument = FormSubmission & Document;

@Schema({ timestamps: true })
export class FormSubmission {
  @Prop({ required: false, index: true })
  formId?: string;

  @Prop({ required: true, type: [Object] })
  questions: Array<{
    id: string;
    type: 'text' | 'email' | 'multiple-choice';
    title: string;
    placeholder?: string;
    required?: boolean;
    options?: string[];
    helperText?: string;
  }>;

  @Prop({ required: true, type: Object })
  answers: Record<string, any>;

  @Prop({ required: false, index: true })
  userEmail?: string;

  @Prop({ required: false })
  userAgent?: string;

  @Prop({ required: false })
  ipAddress?: string;

  @Prop({ required: false })
  submittedAt?: Date;

  @Prop({ required: false, default: false })
  isProcessed?: boolean;

  @Prop({ required: false })
  processedAt?: Date;

  @Prop({ required: false, type: Object })
  metadata?: Record<string, any>;
}

export const FormSubmissionSchema = SchemaFactory.createForClass(FormSubmission);

// Add indexes for better query performance
FormSubmissionSchema.index({ formId: 1, submittedAt: -1 });
FormSubmissionSchema.index({ userEmail: 1, submittedAt: -1 });
FormSubmissionSchema.index({ submittedAt: -1 });
