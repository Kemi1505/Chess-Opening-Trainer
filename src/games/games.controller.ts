import { Controller, Post, Body, Get, Param} from '@nestjs/common';
import { ChessdotcomService } from './providers/chessdotcom.service';
import { ChessService } from './providers/lichess.service';
import { InsightService } from './providers/insights.service';
    
@Controller('games')
export class GamesController {
    constructor(
        private readonly chessService: ChessdotcomService,
        private readonly chessService2: ChessService,
        private readonly insightService: InsightService){}

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
    @Get('stats/:username')
    getStats(@Param('username') username: string) {
    return this.chessService2.getLossStats(username);
}
    @Get('insights/:username')
    getInsights(@Param('username') username: string) {
    return this.insightService.getInsights(username);
}
}
