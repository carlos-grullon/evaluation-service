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
import { computeTextScoresAndFeedback } from '../text/scoring';

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
      // LanguageTool grammar/style analysis with graceful fallback
      const lt = new LanguageToolClient();
      const lang = job.data.language || 'en-US';
      let scores: TextEvaluationResult['scores'];
      let feedback: NonNullable<TextEvaluationResult['feedback']>;
      try {
        const res = await lt.check({ text: job.data.text, language: lang });
        ({ scores, feedback } = computeTextScoresAndFeedback({
          text: job.data.text,
          matches: res.matches.map((m) => ({ message: m.message })),
        }));
      } catch (e) {
        // Fallback: neutral scores and actionable message
        scores = { grammar: 0.8, vocabulary: 0.85, coherence: 0.85, overall: 0.83 };
        feedback = {
          summary: 'Automated grammar analysis unavailable; using fallback heuristic.',
          suggestions: ['Try again later or provide more context.'],
        };
      }
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
