import { Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';
import { ChessdotcomService } from './chessdotcom.service';


@Injectable()
export class ChessService {
  constructor(
    private http: HttpService,
    private prisma: PrismaService,
    private chess: ChessdotcomService
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

        formatted.push({
          username,
          platform: 'chesscom',
          pgn: game.pgn,
          openingName: opening?.name || null,
          ecoCode: opening?.eco_code || null,
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
      const games = res.data
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line));

      const formatted = games.map((game) => ({
        username,
        platform: 'lichess',
        pgn: game.moves,
      }));

      await this.prisma.userGame.createMany({
        data: formatted,
        skipDuplicates: true,
      });

      return formatted;

    } catch (error) {
      return error
    }
  }
}