import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis();

export const evaluationQueue = new Queue('evaluation', { connection });