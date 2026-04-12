import { Controller, Post, Body, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { type Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  async create(@Body() registerUser: RegisterUserDto) {
    return this.authService.register(registerUser);
  }

  @Post()
  async login(
    @Body() loginUser: LoginUserDto, 
    @Res({ passthrough: true }) res: Response
  ) {
    return this.authService.login(loginUser, res)
  }

}
