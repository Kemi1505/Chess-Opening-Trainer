import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getOverview(username: string) {

    const [
      allSessions,
      schedules,
    ] = await Promise.all([
      this.prisma.practiceSession.findMany({
        where: { username },
        orderBy: { practicedAt: 'asc' },
      }),
      this.prisma.spacedRepetitionSchedule.findMany({
        where: { username },
      }),
    ])

    if (allSessions.length === 0) {
      return {
        totalSessions: 0,
        totalPositionsPracticed: 0,
        retentionRate: 0,
        currentStreak: 0,
        weeklyActivity: [],
        openingBreakdown: [],
      }
    }

    const totalPositionsPracticed = allSessions.length
    const totalCorrect = allSessions.filter((s) => s.wasCorrect).length
    const retentionRate = parseFloat(
      ((totalCorrect / totalPositionsPracticed) * 100).toFixed(1),
    )

    // Count unique days practiced
    const uniqueDays = new Set(
      allSessions.map((s) => s.practicedAt.toISOString().split('T')[0]),
    )
    const totalSessions = uniqueDays.size

    // Calculate current streak
    const currentStreak = this.calculateStreak(
      Array.from(uniqueDays).sort(),
    )

    // Weekly activity — last 7 days
    const weeklyActivity = this.getWeeklyActivity(allSessions)

    // Per opening breakdown
    const openingBreakdown = this.getOpeningBreakdown(allSessions, schedules)

    return {
      totalSessions,
      totalPositionsPracticed,
      retentionRate,
      currentStreak,
      weeklyActivity,
      openingBreakdown,
    }
  }

  private calculateStreak(sortedDays: string[]): number {
    if (sortedDays.length === 0) return 0

    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split('T')[0]

    // Streak is broken if last session was not today or yesterday
    const lastDay = sortedDays[sortedDays.length - 1]
    if (lastDay !== today && lastDay !== yesterday) return 0

    let streak = 1
    for (let i = sortedDays.length - 1; i > 0; i--) {
      const current = new Date(sortedDays[i])
      const previous = new Date(sortedDays[i - 1])
      const diffDays = Math.round(
        (current.getTime() - previous.getTime()) / 86400000,
      )

      if (diffDays === 1) {
        streak++
      } else {
        break
      }
    }

    return streak
  }

  private getWeeklyActivity(sessions: any[]) {
    const last7Days: string[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86400000)
      last7Days.push(date.toISOString().split('T')[0])
    }

    return last7Days.map((day) => {
      const daySessions = sessions.filter(
        (s) => s.practicedAt.toISOString().split('T')[0] === day,
      )
      const correct = daySessions.filter((s) => s.wasCorrect).length

      return {
        date: day,
        positionsPracticed: daySessions.length,
        correct,
        incorrect: daySessions.length - correct,
      }
    })
  }

  private getOpeningBreakdown(sessions: any[], schedules: any[]) {
    const openingMap = new Map
      string,
      { ecoCode: string; correct: number; total: number }
    >()

    for (const session of sessions) {
      const existing = openingMap.get(session.openingName) ?? {
        ecoCode: session.ecoCode,
        correct: 0,
        total: 0,
      }

      existing.total++
      if (session.wasCorrect) existing.correct++
      openingMap.set(session.openingName, existing)
    }

    return Array.from(openingMap.entries()).map(([openingName, stats]) => {
      const schedule = schedules.find((s) => s.openingName === openingName)

      return {
        openingName,
        ecoCode: stats.ecoCode,
        totalPracticed: stats.total,
        retentionRate: parseFloat(
          ((stats.correct / stats.total) * 100).toFixed(1),
        ),
        currentInterval: schedule?.interval ?? 1,
        nextReviewAt: schedule?.nextReviewAt ?? null,
      }
    }).sort((a, b) => a.retentionRate - b.retentionRate)
  }
}
