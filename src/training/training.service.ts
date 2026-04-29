import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { calculateNextReview } from './sm2-algorithm'

@Injectable()
export class TrainingService {
  constructor(private prisma: PrismaService) {}

  // Seed the schedule for a user's weak openings
  // Called after analysis is complete
  async seedSchedule(username: string) {
    // TODO: replace username with userId after implementing JwtAuthGuard

    // Get all classified games for this user
    const games = await this.prisma.userGame.findMany({
      where: {
        username,
        openingName: { not: null },
      },
    })

    if (games.length === 0) {
      return { message: 'No classified games found. Run analysis first.' }
    }

    // Get unique openings from game history
    const uniqueOpenings = new Map<string, { ecoCode: string }>()

    for (const game of games) {
      if (!uniqueOpenings.has(game.openingName!)) {
        uniqueOpenings.set(game.openingName!, {
          ecoCode: game.ecoCode ?? '',
        })
      }
    }

    // Create a schedule entry for each opening
    // upsert so running this twice does not create duplicates
    let seeded = 0

    for (const [openingName, data] of uniqueOpenings.entries()) {
      await this.prisma.spacedRepetitionSchedule.upsert({
        where: {
          username_openingName: { username, openingName },
        },
        update: {},  // do not overwrite existing progress
        create: {
          username,
          openingName,
          ecoCode: data.ecoCode,
          easeFactor: 2.5,
          interval: 1,
          repetitions: 0,
          nextReviewAt: new Date(),
        },
      })
      seeded++
    }

    return {
      message: 'Schedule seeded',
      openingsScheduled: seeded,
    }
  }

  // Get the next position due for review
  async getNextPosition(username: string) {
    // TODO: replace username with userId after implementing JwtAuthGuard

    const schedule = await this.prisma.spacedRepetitionSchedule.findFirst({
      where: {
        username,
        nextReviewAt: { lte: new Date() }, // due now or overdue
      },
      orderBy: {
        nextReviewAt: 'asc', // most overdue first
      },
    })

    if (!schedule) {
      return {
        message: 'No positions due for review. Come back later.',
        position: null,
      }
    }

    // Fetch a game position for this opening to practice
    const game = await this.prisma.userGame.findFirst({
      where: {
        username,
        openingName: schedule.openingName,
        deviation_move: { not: null },
      },
    })

    return {
      scheduleId: schedule.id,
      openingName: schedule.openingName,
      ecoCode: schedule.ecoCode,
      deviationMove: game?.deviation_move ?? null,
      pgn: game?.pgn ?? null,
      interval: schedule.interval,
      repetitions: schedule.repetitions,
    }
  }

  // Record the user's answer and update the schedule
  async recordAnswer(username: string, scheduleId: string, wasCorrect: boolean) {
    // TODO: replace username with userId after implementing JwtAuthGuard

    const schedule = await this.prisma.spacedRepetitionSchedule.findUnique({
      where: { id: scheduleId },
    })

    if (!schedule) {
      throw new Error('Schedule entry not found')
    }

    // Run the SM-2 algorithm
    const result = calculateNextReview({
      wasCorrect,
      easeFactor: schedule.easeFactor,
      interval: schedule.interval,
      repetitions: schedule.repetitions,
    })

    // Update the schedule with new values
    await this.prisma.spacedRepetitionSchedule.update({
      where: { id: scheduleId },
      data: {
        easeFactor: result.easeFactor,
        interval: result.interval,
        repetitions: result.repetitions,
        nextReviewAt: result.nextReviewAt,
      },
    })

    return {
      wasCorrect,
      nextReviewAt: result.nextReviewAt,
      interval: result.interval,
      easeFactor: result.easeFactor,
      message: wasCorrect
        ? `Correct. See you in ${result.interval} day${result.interval === 1 ? '' : 's'}.`
        : 'Incorrect. This position will come back tomorrow.',
    }
  }
}