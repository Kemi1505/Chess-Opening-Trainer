import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { GoogleStrategy } from './strategy/google-strategy';

@Module({
  imports: [JwtModule.register({
      secret: 'kemi-chess-secret-key',
      signOptions: { 
        expiresIn: '3h'
      },
    }),
  ],
  controllers: [AuthController],
  providers: [GoogleStrategy, AuthService],
})
export class AuthModule {}
