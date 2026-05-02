import { Controller, Get, Body } from '@nestjs/common'
import { AnalyticsService } from './analytics.service'

// TODO: add @UseGuards(JwtAuthGuard) after implementing auth

class AnalyticsDto {
  username!: string
}

@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('overview')
  async getOverview(@Body() body: AnalyticsDto) {
    return this.analyticsService.getOverview(body.username)
  }
}
