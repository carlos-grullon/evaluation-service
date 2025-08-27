import 'dotenv/config';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import mongoose from 'mongoose';
import { EvaluationSchema, Evaluation } from '../persistence/evaluation.schema';
import { isHttpsS3Url, headObjectIfEnabled } from '../storage/s3.client';

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(mongoUri, { dbName: process.env.MONGODB_DB_NAME || undefined });
  const EvaluationModel = mongoose.models[Evaluation.name] || mongoose.model(Evaluation.name, EvaluationSchema);

  const connection = new IORedis({
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? 6379),
    maxRetriesPerRequest: null,
  });

  const worker = new Worker(
    'evaluation',
    async (job) => {
      if (job.name !== 'audio-evaluation') return; // ignore non-audio jobs in this worker
      const jobId = String(job.id);
      await EvaluationModel.updateOne({ jobId }, { $set: { status: 'processing' } }).exec();

      // Basic S3 URL validation stub
      const s3Url: string | undefined = (job.data && job.data.s3Url) || undefined;
      if (!s3Url || !isHttpsS3Url(s3Url) || !(await headObjectIfEnabled(s3Url))) {
        const msg = 'Invalid or inaccessible S3 URL';
        await EvaluationModel.updateOne({ jobId }, { $set: { status: 'failed', error: msg } }).exec();
        throw new Error(msg);
      }

      // TODO: Implement ASR + Azure Pronunciation Assessment pipeline
      await new Promise((r) => setTimeout(r, 1500));
      const scores = { pronunciation: 0.8, fluency: 0.82, completeness: 0.9, overall: 0.84 };
      const feedback = { summary: 'Good clarity; work on pacing.', suggestions: ['Reduce filler words.'] };
      await EvaluationModel.updateOne(
        { jobId },
        { $set: { status: 'completed', scores, feedback } },
      ).exec();
      return { success: true, scores };
    },
    { connection },
  );

  worker.on('completed', (job) => console.log(`[audio-worker] Job ${job.id} completed`));
  worker.on('failed', (job, error) => console.log(`[audio-worker] Job ${job?.id} failed: ${error}`));
}

main().catch((e) => {
  console.error('[audio-worker] Fatal error starting worker', e);
  process.exit(1);
});
