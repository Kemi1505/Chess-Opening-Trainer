import { IsString, IsNotEmpty } from 'class-validator'

export class NextPositionDto {
  @IsString()
  @IsNotEmpty()
  username!: string
}
