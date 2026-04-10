import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterUserDto } from './dto/register-user.dto';
import * as bcrypt from 'bcrypt'

@Injectable()
export class AuthService {
    constructor(private prisma: PrismaService){}
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
}
