import { InsightsService } from './insights.service'
import {
  isCritical,
  buildCriticalCard,
  isDecaying,
  buildDecayingCard,
  buildHealthyCard,
} from './insights.service'

// ─── Rule Unit Tests ──────────────────────────────────────────────────────────

describe('isCritical', () => {
  it('should return true when loss rate is above 0.6 and games >= 5', () => {
    expect(isCritical(0.7, 10)).toBe(true)
  })

  it('should return true at exactly 0.61 loss rate', () => {
    expect(isCritical(0.61, 5)).toBe(true)
  })

  it('should return false when loss rate is exactly 0.6', () => {
    // 0.6 is the boundary — must be strictly greater than
    expect(isCritical(0.6, 10)).toBe(false)
  })

  it('should return false when loss rate is high but games < 5', () => {
    // Not enough games to be statistically meaningful
    expect(isCritical(0.9, 4)).toBe(false)
  })

  it('should return false when loss rate is low', () => {
    expect(isCritical(0.3, 20)).toBe(false)
  })
})

describe('isDecaying', () => {
  it('should return true when not practiced in 10+ days and loss rate is acceptable', () => {
    expect(isDecaying(10, 0.4)).toBe(true)
  })

  it('should return true at exactly 10 days', () => {
    expect(isDecaying(10, 0.5)).toBe(true)
  })

  it('should return false when practiced within 9 days', () => {
    expect(isDecaying(9, 0.4)).toBe(false)
  })

  it('should return false when daysSinceLastPractice is null', () => {
    expect(isDecaying(null, 0.4)).toBe(false)
  })

  it('should return false when loss rate is above 0.6 — critical takes priority', () => {
    expect(isDecaying(15, 0.7)).toBe(false)
  })
})

// ─── Card Builder Tests ───────────────────────────────────────────────────────

describe('buildCriticalCard', () => {
  it('should return a card with status critical', () => {
    const card = buildCriticalCard('Sicilian Najdorf', 'B90', 13, 19, 0.68, 6)
    expect(card.status).toBe('critical')
  })

  it('should include correct loss rate in insight text', () => {
    const card = buildCriticalCard('Sicilian Najdorf', 'B90', 13, 19, 0.68, 6)
    expect(card.insight).toContain('68%')
  })

  it('should include opening name in action text', () => {
    const card = buildCriticalCard('Sicilian Najdorf', 'B90', 13, 19, 0.68, 6)
    expect(card.action).toContain('Sicilian Najdorf')
  })

  it('should store all provided values correctly', () => {
    const card = buildCriticalCard('Sicilian Najdorf', 'B90', 13, 19, 0.68, 6)
    expect(card.openingName).toBe('Sicilian Najdorf')
    expect(card.ecoCode).toBe('B90')
    expect(card.losses).toBe(13)
    expect(card.totalGames).toBe(19)
    expect(card.lossRate).toBe(0.68)
    expect(card.daysSinceLastPractice).toBe(6)
  })
})

describe('buildDecayingCard', () => {
  it('should return a card with status decaying', () => {
    const card = buildDecayingCard('French Defense', 'C00', 4, 11, 0.36, 14)
    expect(card.status).toBe('decaying')
  })

  it('should include days since last practice in insight text', () => {
    const card = buildDecayingCard('French Defense', 'C00', 4, 11, 0.36, 14)
    expect(card.insight).toContain('14 days')
  })

  it('should include opening name in action text', () => {
    const card = buildDecayingCard('French Defense', 'C00', 4, 11, 0.36, 14)
    expect(card.action).toContain('French Defense')
  })
})

describe('buildHealthyCard', () => {
  it('should return a card with status healthy', () => {
    const card = buildHealthyCard('Ruy Lopez', 'C60', 3, 18, 0.17, 2)
    expect(card.status).toBe('healthy')
  })

  it('should show correct win rate in insight text', () => {
    // 1 - 0.17 = 0.83 = 83%
    const card = buildHealthyCard('Ruy Lopez', 'C60', 3, 18, 0.17, 2)
    expect(card.insight).toContain('83%')
  })

  it('should handle null daysSinceLastPractice', () => {
    const card = buildHealthyCard('Ruy Lopez', 'C60', 3, 18, 0.17, null)
    expect(card.daysSinceLastPractice).toBeNull()
    expect(card.status).toBe('healthy')
  })
})

// ─── InsightsService Tests ────────────────────────────────────────────────────

describe('InsightsService', () => {
  let service: InsightsService
  let mockPrisma: any

  beforeEach(() => {
    mockPrisma = {
      userGame: {
        findMany: jest.fn(),
      },
    }
    service = new InsightsService(mockPrisma)
  })

  it('should return empty summary when user has no games', async () => {
    mockPrisma.userGame.findMany.mockResolvedValue([])

    const result = await service.getSummary('testuser')

    expect(result.todaysFocus).toBe(
      'No games analysed yet. Import your games to get started.',
    )
    expect(result.weeklyPlan).toEqual([])
    expect(result.openingCards).toEqual([])
  })

  it('should skip openings with fewer than 5 games', async () => {
    // Only 4 games with this opening — should not appear in cards
    mockPrisma.userGame.findMany.mockResolvedValue([
      { openingName: 'Ruy Lopez', ecoCode: 'C60', outcome: 'loss', createdAt: new Date() },
      { openingName: 'Ruy Lopez', ecoCode: 'C60', outcome: 'loss', createdAt: new Date() },
      { openingName: 'Ruy Lopez', ecoCode: 'C60', outcome: 'win', createdAt: new Date() },
      { openingName: 'Ruy Lopez', ecoCode: 'C60', outcome: 'win', createdAt: new Date() },
    ])

    const result = await service.getSummary('testuser')
    expect(result.openingCards).toHaveLength(0)
  })

  it('should classify a high loss rate opening as critical', async () => {
    // 7 losses out of 10 games = 70% loss rate — should be critical
    const games = Array.from({ length: 10 }, (_, i) => ({
      openingName: 'Sicilian Najdorf',
      ecoCode: 'B90',
      outcome: i < 7 ? 'loss' : 'win',
      createdAt: new Date(),
    }))

    mockPrisma.userGame.findMany.mockResolvedValue(games)

    const result = await service.getSummary('testuser')
    expect(result.openingCards[0].status).toBe('critical')
    expect(result.openingCards[0].openingName).toBe('Sicilian Najdorf')
  })

  it('should classify an old opening as decaying', async () => {
    // 5 games with acceptable loss rate but last played 15 days ago
    const oldDate = new Date()
    oldDate.setDate(oldDate.getDate() - 15)

    const games = Array.from({ length: 5 }, () => ({
      openingName: 'French Defense',
      ecoCode: 'C00',
      outcome: 'win',
      createdAt: oldDate,
    }))

    mockPrisma.userGame.findMany.mockResolvedValue(games)

    const result = await service.getSummary('testuser')
    expect(result.openingCards[0].status).toBe('decaying')
  })

  it('should classify a recent well-performing opening as healthy', async () => {
    // 5 games, only 1 loss, played recently
    const recentDate = new Date()
    recentDate.setDate(recentDate.getDate() - 2)

    const games = Array.from({ length: 5 }, (_, i) => ({
      openingName: 'Ruy Lopez',
      ecoCode: 'C60',
      outcome: i === 0 ? 'loss' : 'win',
      createdAt: recentDate,
    }))

    mockPrisma.userGame.findMany.mockResolvedValue(games)

    const result = await service.getSummary('testuser')
    expect(result.openingCards[0].status).toBe('healthy')
  })

  it('should sort cards: critical first, decaying second, healthy last', async () => {
    const recentDate = new Date()
    const oldDate = new Date()
    oldDate.setDate(oldDate.getDate() - 15)

    // Mix of openings that should produce all three states
    const games = [
      // Ruy Lopez — healthy (recent, low loss rate)
      ...Array.from({ length: 5 }, () => ({
        openingName: 'Ruy Lopez', ecoCode: 'C60',
        outcome: 'win', createdAt: recentDate,
      })),
      // French Defense — decaying (old, low loss rate)
      ...Array.from({ length: 5 }, () => ({
        openingName: 'French Defense', ecoCode: 'C00',
        outcome: 'win', createdAt: oldDate,
      })),
      // Sicilian Najdorf — critical (high loss rate)
      ...Array.from({ length: 10 }, (_, i) => ({
        openingName: 'Sicilian Najdorf', ecoCode: 'B90',
        outcome: i < 7 ? 'loss' : 'win', createdAt: recentDate,
      })),
    ]

    mockPrisma.userGame.findMany.mockResolvedValue(games)

    const result = await service.getSummary('testuser')
    const statuses = result.openingCards.map((c) => c.status)

    expect(statuses[0]).toBe('critical')
    expect(statuses[1]).toBe('decaying')
    expect(statuses[2]).toBe('healthy')
  })

  it('should set todaysFocus to the critical opening when one exists', async () => {
    const games = Array.from({ length: 10 }, (_, i) => ({
      openingName: 'Sicilian Najdorf', ecoCode: 'B90',
      outcome: i < 7 ? 'loss' : 'win', createdAt: new Date(),
    }))

    mockPrisma.userGame.findMany.mockResolvedValue(games)

    const result = await service.getSummary('testuser')
    expect(result.todaysFocus).toContain('Sicilian Najdorf')
  })

  it('should include all openings in the weekly plan', async () => {
    const recentDate = new Date()
    const oldDate = new Date()
    oldDate.setDate(oldDate.getDate() - 15)

    const games = [
      ...Array.from({ length: 5 }, () => ({
        openingName: 'Ruy Lopez', ecoCode: 'C60',
        outcome: 'win', createdAt: recentDate,
      })),
      ...Array.from({ length: 5 }, () => ({
        openingName: 'French Defense', ecoCode: 'C00',
        outcome: 'win', createdAt: oldDate,
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        openingName: 'Sicilian Najdorf', ecoCode: 'B90',
        outcome: i < 7 ? 'loss' : 'win', createdAt: recentDate,
      })),
    ]

    mockPrisma.userGame.findMany.mockResolvedValue(games)

    const result = await service.getSummary('testuser')

    // Every opening card should have a corresponding weekly plan entry
    expect(result.weeklyPlan).toHaveLength(result.openingCards.length)
    expect(result.weeklyPlan.some((p) => p.includes('Sicilian Najdorf'))).toBe(true)
    expect(result.weeklyPlan.some((p) => p.includes('French Defense'))).toBe(true)
    expect(result.weeklyPlan.some((p) => p.includes('Ruy Lopez'))).toBe(true)
  })
})