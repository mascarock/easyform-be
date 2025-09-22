import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Logger,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { Request } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DraftsService } from './drafts.service';
import {
  SaveDraftDto,
  DraftSubmissionResponseDto,
  GetDraftResponseDto,
  GetDraftUnionResponseDto,
  DeleteDraftResponseDto,
  CleanupDraftsResponseDto,
} from '../../common/dto/draft-submission.dto';

@Controller('forms/draft')
@UseGuards(ThrottlerGuard)
export class DraftsController {
  private readonly logger = new Logger(DraftsController.name);

  constructor(private readonly draftsService: DraftsService) {}

  @Post('save')
  @HttpCode(HttpStatus.OK)
  async saveDraft(
    @Body() saveDraftDto: SaveDraftDto,
    @Req() request: Request,
  ): Promise<DraftSubmissionResponseDto> {
    this.logger.log(`Received draft save request for session: ${saveDraftDto.sessionId}`);

    // Extract metadata from request
    const metadata = {
      userAgent: request.get('User-Agent'),
      ipAddress: request.ip || request.connection.remoteAddress,
    };

    return this.draftsService.saveDraft(saveDraftDto, metadata);
  }

  @Get(':sessionId')
  @HttpCode(HttpStatus.OK)
  async getDraft(@Param('sessionId') sessionId: string): Promise<GetDraftUnionResponseDto> {
    this.logger.log(`Received draft retrieval request for session: ${sessionId}`);

    const draft = await this.draftsService.getDraft(sessionId);

    if (!draft) {
      this.logger.log(`No draft found for session: ${sessionId} - returning empty response`);
      return {
        success: true,
        message: 'No draft found for this session',
        draft: null,
      };
    }

    return {
      success: true,
      message: 'Draft retrieved successfully',
      draft: draft,
    };
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.OK)
  async deleteDraft(@Param('sessionId') sessionId: string): Promise<DeleteDraftResponseDto> {
    this.logger.log(`Received draft deletion request for session: ${sessionId}`);

    return this.draftsService.deleteDraft(sessionId);
  }

  @Get('')
  @HttpCode(HttpStatus.OK)
  async getDraftStatistics(@Query('formId') formId?: string) {
    this.logger.log(`Received draft statistics request for formId: ${formId || 'all'}`);

    return this.draftsService.getDraftStatistics(formId);
  }

  @Get('admin/cleanup')
  @HttpCode(HttpStatus.OK)
  async cleanupExpiredDrafts(): Promise<CleanupDraftsResponseDto> {
    this.logger.log('Received expired drafts cleanup request');

    return this.draftsService.cleanupExpiredDrafts();
  }
}