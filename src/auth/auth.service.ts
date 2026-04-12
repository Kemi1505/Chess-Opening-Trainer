import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterUserDto } from './dto/register-user.dto';
import * as bcrypt from 'bcrypt'
import { LoginUserDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { cookiesOptions } from './cookies-options';
//import { AuthMethod} from 'prisma/schema.prisma';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService
    ){}
    async register(registerUser: RegisterUserDto){
        const {username, password, email, confirm_password} = registerUser;
        const existingEmail = await this.prisma.user.findUnique({where: {email}})
        if (existingEmail){
            throw new BadRequestException('User with email exists')
        }
        if (password !== confirm_password){
            throw new BadRequestException('Password must match')
        }
        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await this.prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword
            },
            
        })
        return({
            message: "Signed Up Successfully",
            id: user.id,
            username: user.username,
            email: user.email,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        })
    }

    async login(loginUser: LoginUserDto, res: Response){
        const {email, password} = loginUser;
        //check if email in database
        const user = await this.prisma.user.findUnique({where: {email}})
        if(!user){
            throw new BadRequestException('Invalid Email or Password')
        }
        //comapare password hash
        const checkPassword = await bcrypt.compare(password, user.password)
        if(!checkPassword){
            throw new BadRequestException('Invalid Email or Password')
        }
        const payload = {
            sub: user.id,
            email: user.email,
            username: user.username
        }
        //generate tokens
        const accessToken = await this.jwtService.signAsync(payload)
        const refreshToken = this.jwtService.signAsync(payload, {expiresIn: '3d'})

        //setcookies
        res.cookie('Authentication-AcesssToken', accessToken, { 
            ...cookiesOptions, 
            maxAge: 1000 * 60 * 60 * 3 // 3 hours in milliseconds
        });
        res.cookie('Authentication-RefreshToken', refreshToken, { 
            ...cookiesOptions, 
            maxAge: 1000 * 60 * 60 * 24 * 3 // 3 days in milliseconds
        });
        return({
            message: 'Log in Successful',
            username: user.username,
            accessToken,
            refreshToken
        })
    }

    async refresh(refreshToken: string){
        try{
            const payload = this.jwtService.verify(refreshToken)
            const id = payload.sub
            const user = this.prisma.user.findUnique({where: {id}})
            const accessToken = await this.jwtService.signAsync(user)
            const refreshToken2 = this.jwtService.signAsync(user, {expiresIn: '3d'})

            return {
                accessToken,
                refreshToken2
            }
        }
        catch(error){
            throw new UnauthorizedException ('Invalid Token')
        }

    }

    async logout(res: Response){
        //clear cookie
        res.clearCookie('Authentication-AcesssToken',cookiesOptions);
        res.clearCookie('Authentication-RefreshToken', cookiesOptions);
        //return log out message
        return{
            message: "Logged out successfully"
        }
    }

    async validateGoogleUser(details: Partial<RegisterUserDto>){
          let user = await this.prisma.user.findUnique({where: {email: details.email}})
          
          
  }

  async validateOAuthLogin(details: Partial<RegisterUserDto>) {
    // 1. Check if user exists in DB.
    let user = await this.prisma.user.findUnique({where: {email: details.email}}) 
    // 2. If not, create them.
    if(!user){
        user = await this.prisma.user.create({
            data: {
                username: details.username,
                email: details.email,
                password: ''
            },
            
        })
    }
    const payload = { email: details.email, username: details.username };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
