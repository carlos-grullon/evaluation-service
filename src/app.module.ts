import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EvaluationModule } from './evaluation/evaluation.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        REDIS_HOST: Joi.string().default('127.0.0.1'),
        REDIS_PORT: Joi.number().default(6379),
        MONGODB_URI: Joi.string().uri().required(),
        MONGODB_DB_NAME: Joi.string().optional(),
      }),
    }),
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGODB_URI,
        dbName: process.env.MONGODB_DB_NAME || undefined,
      }),
    }),
    EvaluationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
