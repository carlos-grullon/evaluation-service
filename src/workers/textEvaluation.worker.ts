import 'dotenv/config';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import mongoose from 'mongoose';
import { EvaluationSchema, Evaluation } from '../persistence/evaluation.schema';

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
      if (job.name !== 'text-evaluation') return; // ignore non-text jobs in this worker
      const jobId = String(job.id);
      await EvaluationModel.updateOne({ jobId }, { $set: { status: 'processing' } }).exec();
      // TODO: implement real text pipeline (LanguageTool + LLM)
      await new Promise((r) => setTimeout(r, 1000));
      const scores = { grammar: 0.9, vocabulary: 0.85, coherence: 0.88, overall: 0.88 };
      const feedback = { summary: 'Strong writing with minor issues.', suggestions: ['Consider varying sentence length.'] };
      await EvaluationModel.updateOne(
        { jobId },
        { $set: { status: 'completed', scores, feedback } },
      ).exec();
      return { success: true, scores };
    },
    { connection },
  );

  worker.on('completed', (job) => console.log(`[text-worker] Job ${job.id} completed`));
  worker.on('failed', (job, error) => console.log(`[text-worker] Job ${job?.id} failed: ${error}`));
}

main().catch((e) => {
  console.error('[text-worker] Fatal error starting worker', e);
  process.exit(1);
});
