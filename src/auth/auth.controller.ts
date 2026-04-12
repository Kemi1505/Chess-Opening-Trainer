import { Controller, Post, Body, Res, UseGuards, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { type Response } from 'express';
import { GoogleAuthGuard } from './guards/google-guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async create(@Body() registerUser: RegisterUserDto) {
    return this.authService.register(registerUser);
  }

  @Post('login')
  async login(
    @Body() loginUser: LoginUserDto, 
    @Res({ passthrough: true }) res: Response
  ) {
    return this.authService.login(loginUser, res)
  }

  @Post('logout')
  async logout(
    @Res({ passthrough: true }) res: Response
  ) {
    return this.authService.logout(res)
  }

  @Get('google/login')
    @UseGuards(GoogleAuthGuard)
    handleLogin() {
        return {
            msg: 'Redirecting to google...'}
    }

    @Get('google/callback')
    @UseGuards(GoogleAuthGuard)
    async handleredirect(@Req() req, @Res() response: Response) {
        const jwti = await this.authService.validateOAuthLogin(req.user)  
      
        return {
            msg: 'Login',
            jwti,
        }
    }



}
