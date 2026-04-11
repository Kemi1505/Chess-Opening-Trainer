import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterUserDto } from './dto/register-user.dto';
import * as bcrypt from 'bcrypt'
import { LoginUserDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';

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

    async login(loginUser: LoginUserDto){
        //validate using dto
        const {email, password} = loginUser;
        //check if email in database
        const user = await this.prisma.user.findUnique({where: {email}})
        // if not(invalid email/password)
        if(!user){
            throw new BadRequestException('Invalid Email or Password')
        }
        //comapare password hash
        const checkPassword = await bcrypt.compare(password, user.password)
        if(!checkPassword){
            throw new BadRequestException('Invalid Email or Password')
        }

        //const payload = [email. id]
        const payload = {
            sub: user.id,
            email: user.email
        }
        //access= jwtservice sign (payload, date + 3 days)
        const accessToken = this.jwtService.signAsync(payload)
        const refreshToken = this.jwtService.signAsync(payload)
        //refresh= jwtservice sign (payload, date + 1hr)

        //setcookies
        //return (log in, access, refresh)
        return({
            message: 'Log in Successful',
            username: user.username,
            accessToken,
            refreshToken
        })
    }

    async refresh(){
        //body: refresh token
        //verify token, jwtservice.verify
        //if invalid = error
        //find user using the id in the payload {where id: payload.sub}
        // generate accesstoken & refresh token
    }

    async logout(){
        //clear cookie
        //return log out message
    }
}
