import { Injectable } from '@nestjs/common';
import { QueueService } from '../queue/queue.service';
import { CreateTextEvaluationDto } from './dto/create-text-evaluation.dto';
import { CreateAudioEvaluationDto } from './dto/create-audio-evaluation.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Evaluation } from '../persistence/evaluation.schema';
import { EVALUATION_QUEUE_NAME } from '../queue/queue.tokens';

@Injectable()
export class EvaluationService {
  constructor(
    private readonly queueService: QueueService,
    @InjectModel(Evaluation.name) private readonly evaluationModel: Model<Evaluation>,
  ) {}

  async createTextEvaluation(dto: CreateTextEvaluationDto) {
    const job = await this.queueService.addJob(
      EVALUATION_QUEUE_NAME,
      'text-evaluation',
      { text: dto.text, language: dto.language, rubricVersion: dto.rubricVersion },
      {
        removeOnComplete: 1000,
        removeOnFail: 1000,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );

    const doc = await this.evaluationModel.create({
      type: 'text',
      jobId: String(job.id),
      input: { text: dto.text, language: dto.language, meta: {} },
      status: 'pending',
    });

    return { id: doc._id, jobId: job.id };
  }

  async createAudioEvaluation(dto: CreateAudioEvaluationDto) {
    const job = await this.queueService.addJob(
      EVALUATION_QUEUE_NAME,
      'audio-evaluation',
      { s3Url: dto.s3Url, referenceText: dto.referenceText, language: dto.language },
      {
        removeOnComplete: 1000,
        removeOnFail: 1000,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );

    const doc = await this.evaluationModel.create({
      type: 'audio',
      jobId: String(job.id),
      input: { s3Url: dto.s3Url, referenceText: dto.referenceText, language: dto.language, meta: {} },
      status: 'pending',
    });

    return { id: doc._id, jobId: job.id };
  }

  async getEvaluationStatus(id: string) {
    const q = this.queueService.getQueue(EVALUATION_QUEUE_NAME);
    const job = await q.getJob(id);
    const state = job ? await job.getState() : 'not_found';
    const result = job && state === 'completed' ? await job.returnvalue : undefined;
    const failedReason = job && state === 'failed' ? job.failedReason : undefined;

    // Try to read the evaluation document by jobId to enrich status
    const doc = await this.evaluationModel.findOne({ jobId: id }).lean().exec();

    return {
      id,
      state,
      result,
      failedReason,
      document: doc ?? null,
    };
  }
}
