import { Controller, Get, Param } from '@nestjs/common';
import { AnalyticsService, TenantAnalytics } from './analytics.service';

@Controller('v1/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get(':tenantId')
  async getAnalytics(@Param('tenantId') tenantId: string): Promise<TenantAnalytics> {
    return this.analyticsService.getAnalytics(tenantId);
  }
}
