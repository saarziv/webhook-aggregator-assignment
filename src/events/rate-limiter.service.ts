import { Injectable } from '@nestjs/common';

@Injectable()
export class RateLimiterService {
  // Stub — real sliding window logic added in next step
  isRateLimited(_tenantId: string): boolean {
    return false;
  }
}
