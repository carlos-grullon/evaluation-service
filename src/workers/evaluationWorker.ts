import { Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis({
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? 6379),
    maxRetriesPerRequest: null,  // <-- important
});

const worker = new Worker('evaluation', async (job) => {
    console.log('Processing job:', job.id, job.name);
    console.log('Job data:', job.data);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log('Job completed:', job.id);
    return { success: true };
}, { connection });

worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, error) => {
    console.log(`Job ${job?.id} failed with error: ${error}`);
});