import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import mongoose from 'mongoose';
import { EvaluationSchema, Evaluation } from '../persistence/evaluation.schema';
import {
  TextEvaluationJobPayload,
  TextEvaluationResult,
} from '../evaluation/dto/jobs';
import { LanguageToolClient } from '../text/languagetool.client';

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
    async (job: Job<TextEvaluationJobPayload, TextEvaluationResult>) => {
      if (job.name !== 'text-evaluation') return; // ignore non-text jobs in this worker
      const jobId = String(job.id);
      await EvaluationModel.updateOne(
        { jobId },
        { $set: { status: 'processing' } },
      ).exec();
      // LanguageTool grammar/style analysis
      const lt = new LanguageToolClient();
      const lang = job.data.language || 'en-US';
      const res = await lt.check({ text: job.data.text, language: lang });

      // Simple heuristic scoring based on number of matches and text length
      const length = Math.max(1, job.data.text.trim().split(/\s+/).length);
      const matches = res.matches.length;
      const penalty = Math.min(0.5, matches / Math.max(50, length));
      const grammar = Math.max(0, 1 - penalty);
      const vocabulary = Math.max(0, 1 - penalty * 0.8);
      const coherence = Math.max(0, 1 - penalty * 0.6);
      const overall = Number(
        ((grammar + vocabulary + coherence) / 3).toFixed(2),
      );
      const scores: TextEvaluationResult['scores'] = {
        grammar: Number(grammar.toFixed(2)),
        vocabulary: Number(vocabulary.toFixed(2)),
        coherence: Number(coherence.toFixed(2)),
        overall,
      };
      const suggestions = res.matches.slice(0, 5).map((m) => m.message);
      const feedback: NonNullable<TextEvaluationResult['feedback']> = {
        summary:
          matches === 0
            ? 'No issues detected.'
            : `Detected ${matches} potential issue${matches === 1 ? '' : 's'}.`,
        suggestions,
      };
      await EvaluationModel.updateOne(
        { jobId },
        { $set: { status: 'completed', scores, feedback } },
      ).exec();
      return { success: true, scores } satisfies TextEvaluationResult;
    },
    { connection },
  );

  worker.on('completed', (job) =>
    console.log(`[text-worker] Job ${job.id} completed`),
  );
  worker.on('failed', (job, error) =>
    console.log(`[text-worker] Job ${job?.id} failed: ${error}`),
  );
}

main().catch((e) => {
  console.error('[text-worker] Fatal error starting worker', e);
  process.exit(1);
});
