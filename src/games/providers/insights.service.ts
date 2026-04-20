import { Injectable } from '@nestjs/common';
import { ChessService } from './lichess.service';

@Injectable()
export class InsightService {
    constructor(
        private Chess: ChessService){}
    async getInsights(username: string) {
  const stats = await this.Chess.getLossStats(username);

  // sort highest losses first
  const sorted = stats.sort((a, b) => b.losses - a.losses);

  return sorted.map((item, index) => {
    const { insight, action } = generateInsight(
      item.opening,
      item.losses,
      index
    );

    return {
      opening: item.opening,
      losses: item.losses,
      insight,
      action,
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

