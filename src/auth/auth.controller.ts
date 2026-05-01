import { Controller, Post, Body, Res, UseGuards, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { type Response } from 'express';
import { type Request } from 'express';
import { GoogleAuthGuard } from './guards/google-guard';
import { JwtPayLoad, type RequestWithUser } from './types/auth-type';
import { JwtGuard } from './guards/jwt.guard';

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
    @Res({ passthrough: true }) res: Response,
    @Body('refreshToken') refreshToken: string
  ) {
    return this.authService.logout(res, refreshToken)
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string){
    return await this.authService.refresh(refreshToken)
  }

  @Get('google/login')
    @UseGuards(GoogleAuthGuard)
    handleLogin() {
        return {
            message: 'Redirecting to google...'}
    }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async handleredirect(
    @Req() req: RequestWithUser, 
    @Res({ passthrough: true }) res: Response) {
      const tokens = await this.authService.validateOAuthLogin(req.user, res)  
    
      return {
          message: 'Login Successful',
          tokens,
      }
  }
  @Get('protected')
  @UseGuards(JwtGuard)
  protected(@Req() req: Request){
    const user = req.user as JwtPayLoad
    return{
      message: "You have entered protected route",
      info: {
        id: user.sub,
        name: user.username,
        email: user.email
    }}
  }


}
