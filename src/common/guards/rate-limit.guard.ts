import { Injectable, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async throwThrottlingException(context: ExecutionContext): Promise<void> {
    throw new HttpException(
      {
        success: false,
        message: 'Too many requests. Please try again later.',
        errors: ['Rate limit exceeded'],
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use IP address as the primary tracker
    return req.ip || req.connection?.remoteAddress || 'unknown';
  }
}
