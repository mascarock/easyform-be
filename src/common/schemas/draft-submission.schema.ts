import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DraftSubmissionDocument = DraftSubmission & Document;

@Schema({ timestamps: true })
export class DraftSubmission {
  @Prop({ required: true, unique: true, index: true })
  sessionId: string;

  @Prop({ required: false, index: true })
  formId?: string;

  @Prop({ required: true, type: Object })
  answers: Record<string, any>;

  @Prop({ required: true, min: 0 })
  currentStep: number;

  @Prop({ required: true, index: true })
  lastModified: Date;

  @Prop({ required: true, index: true })
  expiresAt: Date;

  @Prop({ required: false })
  userAgent?: string;

  @Prop({ required: false })
  ipAddress?: string;

  @Prop({ required: false, type: Object })
  metadata?: Record<string, any>;
}

export const DraftSubmissionSchema = SchemaFactory.createForClass(DraftSubmission);

// Add compound indexes for efficient queries (single field indexes are already defined in @Prop decorators)
DraftSubmissionSchema.index({ sessionId: 1, formId: 1 });

// Add TTL index for automatic cleanup of expired drafts
DraftSubmissionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });