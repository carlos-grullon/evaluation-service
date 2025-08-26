import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly connection: IORedis;
  private readonly queues = new Map<string, Queue>();

  constructor() {
    this.connection = new IORedis({
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379),
      maxRetriesPerRequest: null,
    });
  }

  getQueue(name: string): Queue {
    let q = this.queues.get(name);
    if (!q) {
      q = new Queue(name, { connection: this.connection });
      this.queues.set(name, q);
    }
    return q;
  }

  async addJob<T = any>(queueName: string, jobName: string, data: T, opts?: Parameters<Queue['add']>[2]) {
    const q = this.getQueue(queueName);
    return q.add(jobName, data, opts);
  }

  async onModuleDestroy() {
    await Promise.all(
      Array.from(this.queues.values()).map(async (q) => {
        try { await q.close(); } catch {}
      }),
    );
    try { await this.connection.quit(); } catch {}
  }
}
