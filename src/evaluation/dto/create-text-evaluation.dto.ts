import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateTextEvaluationDto {
  @ApiProperty({ example: 'This is my essay about climate change.' })
  @IsString()
  text!: string;

  @ApiProperty({ required: false, example: 'en' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ required: false, example: 'v1' })
  @IsOptional()
  @IsString()
  rubricVersion?: string;
}
