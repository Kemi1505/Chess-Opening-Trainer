import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ChessdotcomService1 {
    constructor(
        private httpService: HttpService,
        private prisma: PrismaService
    ){}

    async matchOpening(pgn: string) {
    const cleanMoves = extractMoves(pgn);
    const openings = await this.prisma.openingMoves.findMany();

    for (const opening of openings) {
      const openingMove = normalizeMoves(opening.pgn_moves).toLowerCase();

      if (cleanMoves.startsWith(openingMove)) {
        return opening;
      }
    }

    return null;
  }

    async getMonthlyURL(username: string){   
        const url = `https://api.chess.com/pub/player/${username}/games/archives`
        try{
            const response = await firstValueFrom(
                this.httpService.get(url, {
            headers: {
                'User-Agent': "Chess Training App",
                'Accept': 'application/json'
            },
            timeout: 8000,
        }))
        return response.data.archives.reverse()
        }
        catch(error: any){
        if (error.code === 'ECONNABORTED'){
            throw new BadRequestException('Request Timeout')
        }
        if (error.status === 404){
            throw new NotFoundException('User not found')
        }
        throw new Error('Failed to load archives')
        }     
    }

    async getGamesFromMonthlyURL(url: string){
        try{
            const response = await firstValueFrom(
                this.httpService.get(url,{
                    headers: {
                        'User-Agent': "Chess Training App",
                        'Accept': 'application/json'
                    }
                })
            )
            return response.data.games
        }
        catch(error){
            return error
        }
    }

    async getGamesFromMonthlyURL2(username: string, noOfGames: number){
        const monthlyURL= this.getMonthlyURL(username)
        const maxGames: Array<string> = []

    }

    
}

function normalizeMoves(moves: string): string {
  return moves
    .replace(/\d+\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMoves(pgn: string): string {
  return pgn
    .replace(/\[.*?\]/g, '')     // remove headers
    .replace(/\{.*?\}/g, '')     // remove comments
    .replace(/\d+\./g, '')       // remove move numbers
    .replace(/1-0|0-1|1\/2-1\/2/g, '') // remove results
    .replace(/\s+/g, ' ')
    .trim();
}
