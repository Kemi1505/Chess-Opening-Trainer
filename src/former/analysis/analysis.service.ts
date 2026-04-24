import { Injectable, OnModuleInit } from '@nestjs/common'
import { OpeningTrie } from './trie-class'
import { PrismaService } from '../../prisma/prisma.service'
import { parsePgnToMoves } from './pgn-parser'

@Injectable()
export class AnalysisService implements OnModuleInit {
  

  constructor(
    private prisma: PrismaService,
    private trie: OpeningTrie
  ) {}

  async onModuleInit() {
    await this.buildTrie()
  }

  private async buildTrie() {
    this.trie = new OpeningTrie()

    const openings = await this.prisma.openingMoves.findMany()

    for (const opening of openings) {
      const moves = parsePgnToMoves(opening.pgn_moves)

      if (moves.length > 0) {
        this.trie.insert(moves, opening.name, opening.eco_code)
      }
    }

    console.log(`Trie built — ${openings.length} openings loaded`)
  }

  private classifyPgn(pgn: string): {
    openingName: string
    ecoCode: string
    deviationMove: number
  } | null {
    const allMoves = parsePgnToMoves(pgn)
    const openingMoves = allMoves.slice(0, 20)
    return this.trie.match(openingMoves)
  }

  async analyseUserGames(username: string) {
    // TODO: replace username param with userId after implementing JwtAuthGuard

    const games = await this.prisma.userGame.findMany({
      where: {
        username,
        openingName: null, // only unclassified games
      },
    })

    if (games.length === 0) {
      return {
        message: 'No unclassified games found',
        classified: 0,
        unclassified: 0,
      }
    }

    let classified = 0
    let unclassified = 0

    for (const game of games) {
      const result = this.classifyPgn(game.pgn)

      if (result) {
        await this.prisma.userGame.update({
          where: { id: game.id },
          data: {
            openingName: result.openingName,
            ecoCode: result.ecoCode,
            deviation_move: result.deviationMove,
          },
        })
        classified++
      } else {
        unclassified++
      }
    }

    return {
      message: 'Analysis complete',
      classified,
      unclassified,
    }
  }

  async getWeaknesses(username: string) {
    // TODO: replace username param with userId after implementing JwtAuthGuard

    const games = await this.prisma.userGame.findMany({
      where: {
        username,
        openingName: { not: null },
      },
    })

    // Group games by opening name
    const openingMap = new Map<string, { losses: number; total: number; ecoCode: string }>()

    for (const game of games) {
      const key = game.openingName!
      const existing = openingMap.get(key) ?? {
        losses: 0,
        total: 0,
        ecoCode: game.ecoCode ?? '',
      }

      existing.total++
      if (game.outcome === 'loss') existing.losses++

      openingMap.set(key, existing)
    }

    // Build result array, filter openings with fewer than 5 games
    const weaknesses = Array.from(openingMap.entries())
      .filter(([_, stats]) => stats.total >= 5)
      .map(([openingName, stats]) => ({
        openingName,
        ecoCode: stats.ecoCode,
        losses: stats.losses,
        totalGames: stats.total,
        lossRate: parseFloat((stats.losses / stats.total).toFixed(2)),
      }))
      .sort((a, b) => b.lossRate - a.lossRate)

    return weaknesses
  }
}