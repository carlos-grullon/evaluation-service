import { Injectable } from '@nestjs/common';
import { QueueService } from '../queue/queue.service';
import { CreateTextEvaluationDto } from './dto/create-text-evaluation.dto';
import { CreateAudioEvaluationDto } from './dto/create-audio-evaluation.dto';
import { Evaluation } from '../persistence/evaluation.schema';
import { EVALUATION_QUEUE_NAME } from '../queue/queue.tokens';
import { S3Service } from '../storage/s3.service';
import { BadRequestException } from '@nestjs/common';
import type { Job } from 'bullmq';
import { EvaluationRepository } from '../persistence/evaluation.repository';

@Injectable()
export class EvaluationService {
  constructor(
    private readonly queueService: QueueService,
    private readonly evaluationRepo: EvaluationRepository,
    private readonly s3Service: S3Service,
  ) {}

  async createTextEvaluation(dto: CreateTextEvaluationDto) {
    const job = await this.queueService.addJob(
      EVALUATION_QUEUE_NAME,
      'text-evaluation',
      {
        text: dto.text,
        language: dto.language,
        rubricVersion: dto.rubricVersion,
      },
      {
        removeOnComplete: 1000,
        removeOnFail: 1000,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );

    const created = await this.evaluationRepo.create({
      type: 'text',
      jobId: String(job.id),
      input: { text: dto.text, language: dto.language, meta: {} },
      status: 'pending',
    } as Evaluation);

    return { id: created.id, jobId: job.id };
  }

  async createAudioEvaluation(dto: CreateAudioEvaluationDto) {
    // Basic validation of s3Url
    const basic = this.s3Service.validateBasicUrl(dto.s3Url);
    if (!basic.ok) {
      throw new BadRequestException(`Invalid s3Url: ${basic.reason}`);
    }

    // Optional HEAD validation controlled by env flag
    if (process.env.AUDIO_S3_HEAD_VALIDATE === 'true') {
      const head = await this.s3Service.headValidate(dto.s3Url);
      if (!head.ok) {
        throw new BadRequestException(`s3Url not accessible: ${head.reason}`);
      }
    }

    const job = await this.queueService.addJob(
      EVALUATION_QUEUE_NAME,
      'audio-evaluation',
      {
        s3Url: dto.s3Url,
        referenceText: dto.referenceText,
        language: dto.language,
      },
      {
        removeOnComplete: 1000,
        removeOnFail: 1000,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );

    const created = await this.evaluationRepo.create({
      type: 'audio',
      jobId: String(job.id),
      input: {
        s3Url: dto.s3Url,
        referenceText: dto.referenceText,
        language: dto.language,
        meta: {},
      },
      status: 'pending',
    } as Evaluation);

    return { id: created.id, jobId: job.id };
  }

  async getEvaluationStatus(id: string) {
    const q = this.queueService.getQueue(EVALUATION_QUEUE_NAME);
    const job = (await q.getJob(id)) as Job<unknown, unknown> | null;
    const state: string = job ? await job.getState() : 'not_found';
    const result: unknown =
      job && state === 'completed' ? job.returnvalue : undefined;
    const failedReason: string | undefined =
      job && state === 'failed'
        ? job.failedReason
          ? String(job.failedReason)
          : undefined
        : undefined;

    // Try to read the evaluation document by jobId to enrich status
    const doc = await this.evaluationRepo.findByJobId(id);

    return {
      id,
      state,
      result,
      failedReason,
      document: doc ?? null,
    };
  }
}
