import { Controller, Post, Body} from '@nestjs/common';
import { ChessdotcomService } from './providers/chessdotcom.service';
    
@Controller('games')
export class GamesController {
    constructor(private readonly chessService: ChessdotcomService){}

    @Post('month')
    async getMonth(@Body('username') username: string){
        return this.chessService.getMonthlyURL(username)
    }

    @Post('url')
    async getgames(@Body('url') url: string){
        return this.chessService.getGamesFromMonthlyURL(url)
    }
}
