import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateAudioEvaluationDto {
  @ApiProperty({ example: 'https://s3.amazonaws.com/bucket/path/audio.wav' })
  @IsUrl()
  s3Url!: string;

  @ApiProperty({ required: false, example: 'Read the following text...' })
  @IsOptional()
  @IsString()
  referenceText?: string;

  @ApiProperty({ required: false, example: 'en' })
  @IsOptional()
  @IsString()
  language?: string;
}
