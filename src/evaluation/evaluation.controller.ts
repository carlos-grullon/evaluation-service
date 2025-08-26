import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { CreateTextEvaluationDto } from './dto/create-text-evaluation.dto';
import { CreateAudioEvaluationDto } from './dto/create-audio-evaluation.dto';

@Controller()
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Post('evaluate/text')
  async createText(@Body() dto: CreateTextEvaluationDto) {
    return this.evaluationService.createTextEvaluation(dto);
  }

  @Post('evaluate/audio')
  async createAudio(@Body() dto: CreateAudioEvaluationDto) {
    return this.evaluationService.createAudioEvaluation(dto);
  }

  @Get('results/:id')
  async getStatus(@Param('id') id: string) {
    return this.evaluationService.getEvaluationStatus(id);
  }
}
