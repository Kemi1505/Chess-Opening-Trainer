import { Controller, Get, Post, Body } from '@nestjs/common'
import { TrainingService } from './training.service'
import { AnswerDto } from './dto/answer.dto'
import { NextPositionDto } from './dto/next-position.dto'


@Controller('training')
export class TrainingController {
  constructor(private trainingService: TrainingService) {}

  // Seed schedule from game history
  @Post('seed')
  async seedSchedule(@Body() body: NextPositionDto) {
    return this.trainingService.seedSchedule(body.username)
  }

  // Get the next position due for review
  @Get('next')
  async getNextPosition(@Body() body: NextPositionDto) {
    return this.trainingService.getNextPosition(body.username)
  }

  // Record user's answer and update schedule
  @Post('answer')
  async recordAnswer(@Body() body: AnswerDto) {
    return this.trainingService.recordAnswer(
      body.username,
      body.scheduleId,
      body.wasCorrect,
    )
  }
}
