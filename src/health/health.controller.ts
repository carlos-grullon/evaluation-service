import { Controller, Get } from '@nestjs/common';
import mongoose from 'mongoose';
import { QueueService } from '../queue/queue.service';

@Controller('health')
export class HealthController {
  constructor(private readonly queueService: QueueService) {}

  @Get()
  async health() {
    const mongoUp = mongoose.connection.readyState === 1; // 1 = connected
    const redisUp = await this.queueService.ping();

    const status = mongoUp && redisUp ? 'ok' : mongoUp || redisUp ? 'degraded' : 'down';

    return {
      status,
      mongo: mongoUp ? 'up' : 'down',
      redis: redisUp ? 'up' : 'down',
      time: new Date().toISOString(),
    };
  }
}
