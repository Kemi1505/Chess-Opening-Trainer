import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtGuard implements CanActivate {
    constructor(
        private readonly authService: AuthService
    ){}
  async canActivate(context: ExecutionContext,)
  : Promise<boolean>{
    
    // 1. get request
    const request = context.switchToHttp().getRequest()
    // 2. extract token from header
    const authorization: string = request.headers.authorization
    if (!authorization ){
        throw new UnauthorizedException("Token missing")
    }
    const new_auth = authorization.split(" ")
    if(new_auth.length !== 2 || new_auth[0] !== "Bearer"){
        throw new UnauthorizedException("Wrong Token Format")
    }
    const token = new_auth[1]
    // 3. verify token
    try{
        // 4. attach payload to request
        const payload = await this.authService.verifyToken(token)
        request.user = payload
        return true
    }
    catch(error){
        throw new UnauthorizedException("You are Unauthorized to make this request")
    }
  }
}