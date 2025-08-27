import { Controller, Get } from '@nestjs/common';
import { Connection } from 'mongoose';
import { QueueService } from '../queue/queue.service';
import { InjectConnection } from '@nestjs/mongoose';

@Controller('health')
export class HealthController {
  constructor(
    private readonly queueService: QueueService,
    @InjectConnection() private readonly mongoConn: Connection,
  ) {}

  @Get()
  async health() {
    // Use Nest-injected connection; ping when connected
    let mongoUp = false;
    try {
      if (this.mongoConn.readyState === 1) {
        const res = await (this.mongoConn as any).db.admin().ping();
        mongoUp = !!res?.ok;
      }
    } catch {
      mongoUp = false;
    }
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
