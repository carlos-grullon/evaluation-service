import { Injectable } from '@nestjs/common';
import { QueueService } from '../queue/queue.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';

const EVALUATION_QUEUE = 'evaluation';

@Injectable()
export class EvaluationService {
  constructor(private readonly queueService: QueueService) {}

  async createEvaluation(dto: CreateEvaluationDto) {
    const job = await this.queueService.addJob(EVALUATION_QUEUE, 'test-job', { text: dto.text }, {
      removeOnComplete: 1000,
      removeOnFail: 1000,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
    return { jobId: job.id };
  }

  async getEvaluationStatus(id: string) {
    const q = this.queueService.getQueue(EVALUATION_QUEUE);
    const job = await q.getJob(id);
    if (!job) return { status: 'not_found' };
    const state = await job.getState();
    const result = state === 'completed' ? await job.returnvalue : undefined;
    const failedReason = state === 'failed' ? job.failedReason : undefined;
    return { id: job.id, state, result, failedReason };
  }
}
