import { Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';
import { ChessdotcomService1 } from './chessdotcom.service';


@Injectable()
export class ChessService {
  constructor(
    private http: HttpService,
    private prisma: PrismaService,
    private chess: ChessdotcomService1
  ) {}

  //  Fetch from Chess.com
  async fetchChessComGames(username: string) {
    try {
      const archivesRes = await firstValueFrom(
        this.http.get(
          `https://api.chess.com/pub/player/${username}/games/archives`,
          {
            headers: { 'User-Agent': 'MyChessApp' },
            timeout: 5000,
          },
        ),
      );

      const archives: string[] = archivesRes.data.archives;
      const allGames: any[] = [];

      for (const url of archives) {
        const res = await firstValueFrom(
          this.http.get(url, {
            headers: { 'User-Agent': 'MyChessApp' },
            timeout: 5000,
          }),
        );

        allGames.push(...res.data.games);
      }

      const formatted = [];

      for (const game of allGames) {
        const opening = await this.chess.matchOpening(game.pgn);

        const result = extractResult(game.pgn);
        const color = getPlayerColor(game.pgn, username);
        const outcome = getOutcome(result, color);

        console.log({ result, color, outcome });

        formatted.push({
          username,
          platform: 'chesscom',
          pgn: game.pgn,
          openingName: opening?.name || null,
          ecoCode: opening?.eco_code || null,
          result,
          outcome,
        });
      }

      await this.prisma.userGame.createMany({
        data: formatted,
        skipDuplicates: true,
      });

      return formatted;

    } catch (error) {
        return error
    }
  }

  // Get loss stats
  async getLossStats(username: string) {
  const stats = await this.prisma.userGame.groupBy({
    by: ['openingName'],
    where: {
      username,
      outcome: 'loss',
      openingName: {
        not: null,
      },
    },
    _count: {
      openingName: true,
    },
  });

  const data = await this.prisma.userGame.findMany({
    where: { username },
  });

  console.log(data);

  

  return stats.map((s) => ({
    opening: s.openingName,
    losses: s._count.openingName,
  }));
}

  // Fetch from Lichess
  async fetchLichessGames(username: string) {
    try {
      const res = await firstValueFrom(
        this.http.get(
          `https://lichess.org/api/games/user/${username}`,
          {
            headers: {
              Accept: 'application/x-ndjson',
            },
            timeout: 5000,
          },
        ),
      );

      // Lichess returns NDJSON (string)
      // const games = res.data
      //   .split('\n')
      //   .filter(Boolean)
      //   .map((line) => JSON.parse(line));

      // const formatted = games.map((game) => ({
      //   username,
      //   platform: 'lichess',
      //   pgn: game.moves,
      // }));

      // await this.prisma.userGame.createMany({
      //   data: formatted,
      //   skipDuplicates: true,
      // });

      return "formatted";

    } catch (error) {
      return error
    }
  }

}


function extractResult(pgn: string): string | null {
  if (pgn.includes('1-0')) return '1-0';
  if (pgn.includes('0-1')) return '0-1';
  if (pgn.includes('1/2-1/2')) return '1/2-1/2';
  return null;
}

function getPlayerColor(pgn: string, username: string): 'white' | 'black' | null {
  const whiteMatch = pgn.match(/\[White "([^"]+)"\]/);
  const blackMatch = pgn.match(/\[Black "([^"]+)"\]/);

  const white = whiteMatch?.[1]?.toLowerCase();
  const black = blackMatch?.[1]?.toLowerCase();

  if (white === username.toLowerCase()) return 'white';
  if (black === username.toLowerCase()) return 'black';

  return null;
}

function getOutcome(
  result: string | null,
  color: 'white' | 'black' | null
): 'win' | 'loss' | 'draw' | null {
  if (!result || !color) return null;

  if (result === '1/2-1/2') return 'draw';

  if (result === '1-0') {
    return color === 'white' ? 'win' : 'loss';
  }

  if (result === '0-1') {
    return color === 'black' ? 'win' : 'loss';
  }

  return null;
}
