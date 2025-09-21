import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Query, 
  Param, 
  HttpCode, 
  HttpStatus,
  UseGuards,
  Req,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { FormsService } from './forms.service';
import { FormSubmissionDto, FormSubmissionResponseDto } from '../../common/dto/form-submission.dto';
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('forms')
@UseGuards(ThrottlerGuard)
export class FormsController {
  private readonly logger = new Logger(FormsController.name);

  constructor(private readonly formsService: FormsService) {}

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  async submitForm(
    @Body() formSubmission: FormSubmissionDto,
    @Req() request: Request,
  ): Promise<FormSubmissionResponseDto> {
    this.logger.log('Received form submission request');

    // Extract metadata from request
    const metadata = {
      userAgent: request.get('User-Agent'),
      ipAddress: request.ip || request.connection.remoteAddress,
      referer: request.get('Referer'),
      origin: request.get('Origin'),
    };

    return this.formsService.submitForm(formSubmission, metadata);
  }

  @Get('submissions')
  async getFormSubmissions(
    @Query('formId') formId?: string,
    @Query('userEmail') userEmail?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    // Validate pagination parameters
    if (limitNum < 1 || limitNum > 100) {
      throw new Error('Limit must be between 1 and 100');
    }
    if (offsetNum < 0) {
      throw new Error('Offset must be non-negative');
    }

    return this.formsService.getFormSubmissions(formId, userEmail, limitNum, offsetNum);
  }

  @Get('submissions/:id')
  async getFormSubmissionById(@Param('id') id: string) {
    const submission = await this.formsService.getFormSubmissionById(id);
    
    if (!submission) {
      throw new Error('Form submission not found');
    }

    return submission;
  }

  @Get('statistics')
  async getFormStatistics(@Query('formId') formId?: string) {
    return this.formsService.getFormStatistics(formId);
  }
}
