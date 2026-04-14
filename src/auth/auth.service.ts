import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterUserDto } from './dto/register-user.dto';
import * as bcrypt from 'bcrypt'
import { LoginUserDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { cookiesOptions } from './cookies-options';
import { Payload } from '@prisma/client/runtime/library';
import { AuthMethod, UserModel } from './types/user-type';
import { PartialGraphHost } from '@nestjs/core';
import { use } from 'passport';
import { ConfigService } from '@nestjs/config';
//import { AuthMethod} from 'prisma/schema.prisma';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService
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
        const refreshToken = await this.jwtService.signAsync(payload, {expiresIn: '3d'})

        

        await this.prisma.refreshToken.create({
            data: {
                userId: user.id,
                hashedToken: refreshToken,
            }
        })

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

    async generateTokens(user: Partial<UserModel>){
        const payload = {
            sub: user.id,
            email: user.email,
            username: user.username
        }
        const accessToken = await this.jwtService.signAsync(payload)
        const refreshToken = await this.jwtService.signAsync(payload, {expiresIn: '3d'})

        return{
            accessToken,
            refreshToken
        }
    }



    async verifyToken(refreshToken: string){
        try{
            const payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: this.configService.get<string>('JWT_SECRET_KEY'),
            })
            return payload 
        }
        catch(error){
            console.log(error)
            throw new UnauthorizedException ('Invalid Token')
        }
    }


    async refresh(firstRefreshToken: string){
        const payload = await this.verifyToken(firstRefreshToken)
        const user = await this.prisma.user.findUnique({where: {id: payload.sub}})
        if(!user){
            throw new BadRequestException ('User not Found')
        }
        //verify user has the refresh token in db
        const tokenInDatabase = await this.prisma.refreshToken.findFirst(
            {where: {
                userId: user.id,
                hashedToken: firstRefreshToken
            }}
        )
        if(!tokenInDatabase){
            throw new BadRequestException('Invalid Token')
        }
        //generate access and refresh tokens
        const {accessToken, refreshToken} = await this.generateTokens(user)
        //update refresh db
        console.log('After gen tokens')
        await this.prisma.refreshToken.update({
            where: { id: tokenInDatabase.id },
            data: {hashedToken: refreshToken,},
        });
        console.log('After saving to db')
        console.log(`access ${accessToken}, refresh ${refreshToken}`)        
        //return both tokens
        return{
            message: 'Log in Successful',
            accessToken,
            refreshToken
        }
        
    }

    async logout(res: Response, refreshToken: string){
        //clear cookie
        res.clearCookie('Authentication-AcesssToken',cookiesOptions);
        res.clearCookie('Authentication-RefreshToken', cookiesOptions);
        //delete refresh token in db
        await this.prisma.refreshToken.delete({
            where: {hashedToken: refreshToken}
        })
        //return log out message
        return{
            message: "Logged out successfully"
        }
    }

  async validateOAuthLogin(details: Partial<RegisterUserDto>, res: Response) {
    // 1. Check if user exists in DB.
    let user = await this.prisma.user.findUnique({where: {email: details.email}}) 
    // 2. If not, create them.
    if(!user){
        user = await this.prisma.user.create({
            data: {
                authType: 'GOOGLE',
                username: details.username,
                email: details.email,
                password: ''
            },
            
        })
    }
    const {accessToken, refreshToken} = await this.generateTokens(user)

    res.cookie('Authentication-AcesssToken', accessToken, { 
            ...cookiesOptions, 
            maxAge: 1000 * 60 * 60 * 3 // 3 hours in milliseconds
        });
    res.cookie('Authentication-RefreshToken', refreshToken, { 
        ...cookiesOptions, 
        maxAge: 1000 * 60 * 60 * 24 * 3 // 3 days in milliseconds
    });
    return {
      accessToken,
      refreshToken
    };
  }
}
