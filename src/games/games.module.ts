import { Module } from '@nestjs/common';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import {HttpModule} from '@nestjs/axios';
import { ChessdotcomService } from './providers/chessdotcom.service';
import { LichessService } from './providers/lichess.service';

@Module({
  imports: [HttpModule],
  controllers: [GamesController],
  providers: [GamesService,ChessdotcomService,LichessService]
})
export class GamesModule {}
