import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class InsightsService {
  constructor(private prisma: PrismaService) {}

  async getSummary(username: string): Promise<InsightSummary> {

    const games = await this.prisma.userGame.findMany({
      where: {
        username,
        openingName: { not: null },
      },
    })

    if (games.length === 0) {
      return {
        todaysFocus: 'No games analysed yet. Import your games to get started.',
        weeklyPlan: [],
        openingCards: [],
      }
    }

    // Group games by opening and calculate stats
    const openingMap = new Map
        string,
        {
          ecoCode: string
          losses: number
          total: number
          lastPlayedAt: Date
        }
    >()
    for (const game of games) {
      const key = game.openingName!
      const existing = openingMap.get(key) ?? {
        ecoCode: game.ecoCode ?? '',
        losses: 0,
        total: 0,
        lastPlayedAt: game.createdAt,
      }

      existing.total++
      if (game.outcome === 'loss') existing.losses++

      // Track most recent game for this opening
      if (game.createdAt > existing.lastPlayedAt) {
        existing.lastPlayedAt = game.createdAt
      }

      openingMap.set(key, existing)
    }

    // Build opening cards by running rules against each opening
    const openingCards: OpeningCard[] = []

    for (const [openingName, stats] of openingMap.entries()) {
      // Skip openings with too few games
      if (stats.total < 5) continue

      const lossRate = stats.losses / stats.total
      const daysSinceLastPractice = this.getDaysSince(stats.lastPlayedAt)

      if (isCritical(lossRate, stats.total)) {
        openingCards.push(
          buildCriticalCard(
            openingName,
            stats.ecoCode,
            stats.losses,
            stats.total,
            lossRate,
            daysSinceLastPractice,
          ),
        )
      } else if (isDecaying(daysSinceLastPractice, lossRate)) {
        openingCards.push(
          buildDecayingCard(
            openingName,
            stats.ecoCode,
            stats.losses,
            stats.total,
            lossRate,
            daysSinceLastPractice!,
          ),
        )
      } else {
        openingCards.push(
          buildHealthyCard(
            openingName,
            stats.ecoCode,
            stats.losses,
            stats.total,
            lossRate,
            daysSinceLastPractice,
          ),
        )
      }
    }

    // Sort: critical first, decaying second, healthy last
    openingCards.sort((a, b) => {
      const order = { critical: 0, decaying: 1, healthy: 2 }
      return order[a.status] - order[b.status]
    })

    const todaysFocus = this.buildTodaysFocus(openingCards)
    const weeklyPlan = this.buildWeeklyPlan(openingCards)

    return {
      todaysFocus,
      weeklyPlan,
      openingCards,
    }
  }

  private getDaysSince(date: Date): number {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  private buildTodaysFocus(cards: OpeningCard[]): string {
    const critical = cards.find((c) => c.status === 'critical')
    if (critical) {
      return `Focus on the ${critical.openingName} today — you are losing ${Math.round(critical.lossRate * 100)}% of these games.`
    }

    const decaying = cards.find((c) => c.status === 'decaying')
    if (decaying) {
      return `Review the ${decaying.openingName} today — you have not practiced it in ${decaying.daysSinceLastPractice} days.`
    }

    return 'All your openings are in good shape. Run a light review session to maintain your retention.'
  }

  private buildWeeklyPlan(cards: OpeningCard[]): string[] {
    const plan: string[] = []

    const criticalCards = cards.filter((c) => c.status === 'critical')
    const decayingCards = cards.filter((c) => c.status === 'decaying')
    const healthyCards = cards.filter((c) => c.status === 'healthy')

    for (const card of criticalCards) {
      plan.push(`Drill the ${card.openingName} daily — critical weakness.`)
    }

    for (const card of decayingCards) {
      plan.push(`Review the ${card.openingName} once — retention is dropping.`)
    }

    for (const card of healthyCards) {
      plan.push(`Skip the ${card.openingName} this week — no action needed.`)
    }

    return plan
  }
}

type OpeningStatus = 'critical' | 'decaying' | 'healthy'

interface OpeningCard {
  openingName: string
  ecoCode: string
  status: OpeningStatus
  losses: number
  totalGames: number
  lossRate: number
  daysSinceLastPractice: number | null
  insight: string
  action: string
}

interface InsightSummary {
  todaysFocus: string
  weeklyPlan: string[]
  openingCards: OpeningCard[]
}

export function isCritical(lossRate: number, totalGames: number): boolean {

  return totalGames >= 5 && lossRate > 0.6
}

export function buildCriticalCard(
  openingName: string,
  ecoCode: string,
  losses: number,
  totalGames: number,
  lossRate: number,
  daysSinceLastPractice: number | null,
): OpeningCard {
  return {
    openingName,
    ecoCode,
    status: 'critical',
    losses,
    totalGames,
    lossRate,
    daysSinceLastPractice,
    insight: `You are losing ${Math.round(lossRate * 100)}% of your ${openingName} games. This is your most urgent weakness.`,
    action: `Practice the ${openingName} daily this week. Focus on the positions where you keep going wrong.`,
  }
}

export function isDecaying(
  daysSinceLastPractice: number | null,
  lossRate: number,
): boolean {
  if (daysSinceLastPractice === null) return false
  return daysSinceLastPractice >= 10 && lossRate <= 0.6
}

export function buildDecayingCard(
  openingName: string,
  ecoCode: string,
  losses: number,
  totalGames: number,
  lossRate: number,
  daysSinceLastPractice: number,
): OpeningCard {
  return {
    openingName,
    ecoCode,
    status: 'decaying',
    losses,
    totalGames,
    lossRate,
    daysSinceLastPractice,
    insight: `You have not practiced the ${openingName} in ${daysSinceLastPractice} days. Your retention is dropping.`,
    action: `Review the ${openingName} once this week before it fades further.`,
  }
}

export function buildHealthyCard(
  openingName: string,
  ecoCode: string,
  losses: number,
  totalGames: number,
  lossRate: number,
  daysSinceLastPractice: number | null,
): OpeningCard {
  return {
    openingName,
    ecoCode,
    status: 'healthy',
    losses,
    totalGames,
    lossRate,
    daysSinceLastPractice,
    insight: `Your ${openingName} is in good shape with a ${Math.round((1 - lossRate) * 100)}% win rate.`,
    action: `Maintain with one light review session this week. No urgent action needed.`,
  }
}