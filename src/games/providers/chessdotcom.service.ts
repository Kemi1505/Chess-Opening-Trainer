import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ChessdotcomService {
    constructor(
        private httpService: HttpService
    ){}

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
