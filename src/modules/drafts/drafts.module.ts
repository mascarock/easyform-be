import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DraftsController } from './drafts.controller';
import { DraftsService } from './drafts.service';
import { DraftSubmission, DraftSubmissionSchema } from '../../common/schemas/draft-submission.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DraftSubmission.name, schema: DraftSubmissionSchema },
    ]),
  ],
  controllers: [DraftsController],
  providers: [DraftsService],
  exports: [DraftsService], // Export for use in other modules
})
export class DraftsModule {}