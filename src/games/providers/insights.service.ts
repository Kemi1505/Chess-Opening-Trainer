import { Injectable } from '@nestjs/common';
import { ChessService } from './lichess.service';
import { PrismaService } from '../../prisma/prisma.service';

type OpeningStats = {
  opening: string;
  losses: number;
  totalGames: number;
  lastPlayed: Date;
};

@Injectable()
export class InsightService {
    constructor(
        private Chess: ChessService,
        private readonly prisma: PrismaService){}

    classifyOpening(stats: OpeningStats) {
    const lossRate = stats.losses / stats.totalGames;

    const daysSinceLastPlayed =
      (Date.now() - new Date(stats.lastPlayed).getTime()) /
      (1000 * 60 * 60 * 24);

    // Critical
    if (lossRate > 0.6) {
      return 'critical';
    }

    // Decaying
    if (daysSinceLastPlayed > 7) {
      return 'decaying';
    }

    // Healthy
    return 'healthy';
  }

  async getUserOpeningStats(username: string) {
  const games = await this.prisma.userGame.findMany({
    where: { username, openingName: { not: null } },
  });

  const map = new Map<string, OpeningStats>();

  for (const game of games) {
    const key = game.openingName!;

    if (!map.has(key)) {
      map.set(key, {
        opening: key,
        losses: 0,
        totalGames: 0,
        lastPlayed: game.createdAt,
      });
    }

    const entry = map.get(key)!;

    entry.totalGames += 1;

    if (game.outcome === 'loss') {
      entry.losses += 1;
    }

    if (game.createdAt > entry.lastPlayed) {
      entry.lastPlayed = game.createdAt;
    }
  }

  return Array.from(map.values());
}

    
    async getInsights(username: string) {
  const stats = await this.getUserOpeningStats(username);

  return stats.map((s) => {
    const status = this.classifyOpening(s);

    return {
      opening: s.opening,
      losses: s.losses,
      totalGames: s.totalGames,
      status,
    };
  });
}
}



function generateInsight(opening: string, losses: number, rank: number) {
  if (rank === 0) {
    return {
      insight: `This is your weakest opening.`,
      action: `Focus on practicing the first 5–8 moves of ${opening} daily.`,
    };
  }

  if (losses > 10) {
    return {
      insight: `You frequently lose in this opening.`,
      action: `Review common traps and play practice games.`,
    };
  }

  if (losses > 5) {
    return {
      insight: `This opening needs improvement.`,
      action: `Practice key positions a few times a week.`,
    };
  }

  return {
    insight: `Not a major weakness yet.`,
    action: `Maintain with occasional practice.`,
  };
}

