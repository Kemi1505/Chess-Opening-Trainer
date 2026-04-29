import { IsBoolean, IsString, IsNotEmpty } from 'class-validator'

export class AnswerDto {
  @IsString()
  @IsNotEmpty()
  scheduleId!: string

  @IsString()
  @IsNotEmpty()
  username!: string

  @IsBoolean()
  wasCorrect!: boolean
}
