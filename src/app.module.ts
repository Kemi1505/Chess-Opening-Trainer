import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { GamesModule } from './games/games.module';

@Module({
  imports: [ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigService available globally
      envFilePath: '.env', 
    }),
   PrismaModule, AuthModule, GamesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
