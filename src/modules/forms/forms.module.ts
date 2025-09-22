import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FormsController } from './forms.controller';
import { FormsService } from './forms.service';
import { FormSubmission, FormSubmissionSchema } from '../../common/schemas/form-submission.schema';
import { DraftSubmission, DraftSubmissionSchema } from '../../common/schemas/draft-submission.schema';
import { FormValidationService } from '../../common/validators/form-validation.validator';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FormSubmission.name, schema: FormSubmissionSchema },
      { name: DraftSubmission.name, schema: DraftSubmissionSchema },
    ]),
  ],
  controllers: [FormsController],
  providers: [FormsService, FormValidationService],
  exports: [FormsService],
})
export class FormsModule {}
