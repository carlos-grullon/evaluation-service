import { Module } from '@nestjs/common';
import { EvaluationController } from './evaluation.controller';
import { EvaluationService } from './evaluation.service';
import { QueueModule } from '../queue/queue.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Evaluation, EvaluationSchema } from '../persistence/evaluation.schema';
import { S3Service } from '../storage/s3.service';
import { ApiKeyGuard } from '../auth/api-key.guard';

@Module({
  imports: [
    QueueModule,
    MongooseModule.forFeature([{ name: Evaluation.name, schema: EvaluationSchema }]),
  ],
  controllers: [EvaluationController],
  providers: [EvaluationService, S3Service, ApiKeyGuard],
})
export class EvaluationModule {}
