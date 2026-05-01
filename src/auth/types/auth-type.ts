//Auth Types
export enum AuthMethod {
  EMAIL_AND_PASSWORD,
  GOOGLE
}

//User Type
export interface UserModel{
    id: string,
    username: string    
    email: string   
    password: string | null,
    createdAt: Date,
    updatedAt: Date
}

//Google User Request
export interface RequestWithUser extends Request{
  user: {
    email: string;
    firstName: string;
    lastName: string;
    username: string;
  }
}

//JWT Payload
export interface JwtPayLoad{
  sub: string,
  email: string,
  username: string,
  iat: number,
  exp: number,
}
