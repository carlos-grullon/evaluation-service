import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';

@Controller('evaluations')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Post()
  async create(@Body() dto: CreateEvaluationDto) {
    return this.evaluationService.createEvaluation(dto);
  }

  @Get(':id')
  async getStatus(@Param('id') id: string) {
    return this.evaluationService.getEvaluationStatus(id);
  }
}
