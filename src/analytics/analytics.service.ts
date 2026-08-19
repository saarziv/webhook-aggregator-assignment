import { Injectable } from '@nestjs/common';

export interface TenantAnalytics {
  tenantId: string;
  eventBreakdown: Record<string, number>;
  rateLimitedCount: number;
}

@Injectable()
export class AnalyticsService {
  // Stub — real aggregation logic added in a later step
  getAnalytics(tenantId: string): TenantAnalytics {
    return { tenantId, eventBreakdown: {}, rateLimitedCount: 0 };
  }
}
