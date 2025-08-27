import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import mongoose from 'mongoose';
import { EvaluationSchema, Evaluation } from '../persistence/evaluation.schema';
import { S3Service } from '../storage/s3.service';
import {
  AudioEvaluationJobPayload,
  AudioEvaluationResult,
} from '../evaluation/dto/jobs';

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(mongoUri, {
    dbName: process.env.MONGODB_DB_NAME || undefined,
  });
  const EvaluationModel =
    mongoose.models[Evaluation.name] ||
    mongoose.model(Evaluation.name, EvaluationSchema);

  const connection = new IORedis({
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? 6379),
    maxRetriesPerRequest: null,
  });

  const worker = new Worker(
    'evaluation',
    async (job: Job<AudioEvaluationJobPayload, AudioEvaluationResult>) => {
      if (job.name !== 'audio-evaluation') return; // ignore non-audio jobs in this worker
      const jobId = String(job.id);
      await EvaluationModel.updateOne(
        { jobId },
        { $set: { status: 'processing' } },
      ).exec();

      // Basic S3 URL validation and optional HEAD probe
      const s3 = new S3Service();
      const s3Url: string | undefined = job.data?.s3Url ?? undefined;
      const basic = s3Url ? s3.validateBasicUrl(s3Url) : { ok: false };
      if (!basic.ok) {
        const msg = `Invalid s3Url: ${basic.reason ?? 'unknown'}`;
        await EvaluationModel.updateOne(
          { jobId },
          { $set: { status: 'failed', error: msg } },
        ).exec();
        throw new Error(msg);
      }
      if (process.env.AUDIO_S3_HEAD_VALIDATE === 'true') {
        const head = await s3.headValidate(s3Url);
        if (!head.ok) {
          const msg = `s3Url not accessible: ${head.reason ?? 'HEAD failed'}`;
          await EvaluationModel.updateOne(
            { jobId },
            { $set: { status: 'failed', error: msg } },
          ).exec();
          throw new Error(msg);
        }
      }

      // TODO: Implement ASR + Azure Pronunciation Assessment pipeline
      await new Promise((r) => setTimeout(r, 1500));
      const scores: AudioEvaluationResult['scores'] = {
        pronunciation: 0.8,
        fluency: 0.82,
        completeness: 0.9,
        overall: 0.84,
      };
      const feedback: NonNullable<AudioEvaluationResult['feedback']> = {
        summary: 'Good clarity; work on pacing.',
        suggestions: ['Reduce filler words.'],
      };
      await EvaluationModel.updateOne(
        { jobId },
        { $set: { status: 'completed', scores, feedback } },
      ).exec();
      return { success: true, scores } satisfies AudioEvaluationResult;
    },
    { connection },
  );

  worker.on('completed', (job) =>
    console.log(`[audio-worker] Job ${job.id} completed`),
  );
  worker.on('failed', (job, error) =>
    console.log(`[audio-worker] Job ${job?.id} failed: ${error}`),
  );
}

main().catch((e) => {
  console.error('[audio-worker] Fatal error starting worker', e);
  process.exit(1);
});
