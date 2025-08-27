import 'dotenv/config';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import mongoose from 'mongoose';
import { EvaluationSchema, Evaluation } from '../persistence/evaluation.schema';

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set. Please configure it in your .env');
  }
  await mongoose.connect(mongoUri);

  const EvaluationModel = mongoose.models[Evaluation.name] || mongoose.model(Evaluation.name, EvaluationSchema);

  const connection = new IORedis({
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? 6379),
    maxRetriesPerRequest: null,
  });

  const worker = new Worker(
    'evaluation',
    async (job) => {
      const jobId = String(job.id);
      console.log(`[worker] Processing job ${jobId} (${job.name})`);

      // mark processing
      await EvaluationModel.updateOne({ jobId }, { $set: { status: 'processing' } }).exec();

      try {
        // simulate processing based on job.name
        if (job.name === 'text-evaluation') {
          await new Promise((r) => setTimeout(r, 1000));
          const scores = { grammar: 0.9, vocabulary: 0.85, coherence: 0.88, overall: 0.88 };
          const feedback = { summary: 'Strong writing with minor issues.', suggestions: ['Consider varying sentence length.'] };
          await EvaluationModel.updateOne(
            { jobId },
            { $set: { status: 'completed', scores, feedback } },
          ).exec();
          return { success: true, scores };
        }

        if (job.name === 'audio-evaluation') {
          await new Promise((r) => setTimeout(r, 1500));
          const scores = { pronunciation: 0.8, fluency: 0.82, completeness: 0.9, overall: 0.84 };
          const feedback = { summary: 'Good clarity; work on pacing.', suggestions: ['Reduce filler words.'] };
          await EvaluationModel.updateOne(
            { jobId },
            { $set: { status: 'completed', scores, feedback } },
          ).exec();
          return { success: true, scores };
        }

        // default handler
        await new Promise((r) => setTimeout(r, 500));
        await EvaluationModel.updateOne({ jobId }, { $set: { status: 'completed' } }).exec();
        return { success: true };
      } catch (err: any) {
        console.error(`[worker] Job ${jobId} failed`, err);
        await EvaluationModel.updateOne({ jobId }, { $set: { status: 'failed', error: String(err?.message || err) } }).exec();
        throw err;
      }
    },
    { connection },
  );

  worker.on('completed', (job) => {
    console.log(`[worker] Job ${job.id} completed`);
  });
  worker.on('failed', (job, error) => {
    console.log(`[worker] Job ${job?.id} failed: ${error}`);
  });
}

main().catch((e) => {
  console.error('[worker] Fatal error starting worker', e);
  process.exit(1);
});