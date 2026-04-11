import {
    IsEmail, 
    IsNotEmpty,
    IsString, 
    MinLength 
} from 'class-validator';
export class LoginUserDto {
    @IsNotEmpty()
    @IsEmail({}, {message: "Provide a valid email"})
    email: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6, {message: "Password should be at least 6 charcters"})
    password: string;

}