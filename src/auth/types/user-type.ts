export interface UserModel{
    id: string,
    username: string    
    email: String   
    password: string
    createdAt: Date,
    updatedAt: Date
}

export enum AuthMethod {
  EMAIL_AND_PASSWORD,
  GOOGLE
}
