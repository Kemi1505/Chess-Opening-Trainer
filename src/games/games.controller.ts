import { Controller, Post, Body} from '@nestjs/common';
import { ChessdotcomService } from './providers/chessdotcom.service';
import { ChessService } from './providers/lichess.service';
    
@Controller('games')
export class GamesController {
    constructor(
        private readonly chessService: ChessdotcomService,
        private readonly chessService2: ChessService){}

    @Post('month')
    async getMonth(@Body('username') username: string){
        return this.chessService.getMonthlyURL(username)
    }

    @Post('url')
    async getgames(@Body('url') url: string){
        return this.chessService.getGamesFromMonthlyURL(url)
    }

    @Post('chesscom')
    getChessCom(@Body('username') username: string) {
        return this.chessService2.fetchChessComGames(username);
  }
}
