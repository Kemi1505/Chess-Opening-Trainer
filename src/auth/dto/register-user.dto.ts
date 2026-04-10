import {
    IsEmail, 
    IsNotEmpty,
    IsString, 
    MinLength 
} from 'class-validator';
export class RegisterUserDto {
    @IsNotEmpty()
    @IsEmail({}, {message: "Provide a valid email"})
    email: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(3, {message: "Username cannot be less than 3 characters"})
    username: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6, {message: "Password should be at least 6 charcters"})
    password: string;

    @IsNotEmpty()
    @IsString()
    confirm_password: string

}