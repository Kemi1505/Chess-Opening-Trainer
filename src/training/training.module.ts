import { Module } from '@nestjs/common'
import { TrainingService } from './training.service'
import { TrainingController } from './training.controller'
import { PrismaService } from '../prisma/prisma.service'

@Module({
  controllers: [TrainingController],
  providers: [TrainingService, PrismaService],
  exports: [TrainingService],
})
export class TrainingModule {}