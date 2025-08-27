import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EvaluationModule } from './evaluation/evaluation.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import * as Joi from 'joi';
import { HealthModule } from './health/health.module';

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
      useFactory: () => {
        // derive authSource from URI if present, else default to 'admin' when credentials exist
        let authSource: string | undefined;
        const uri = process.env.MONGODB_URI;
        try {
          if (uri) {
            const u = new URL(uri);
            const hasCreds = !!(u.username || u.password);
            const params = new URLSearchParams(u.search);
            authSource = params.get('authSource') || (hasCreds ? 'admin' : undefined);
          }
        } catch {
          // ignore parse errors; rely on env-provided URI
        }
        return {
          uri,
          dbName: process.env.MONGODB_DB_NAME || undefined,
          directConnection: true,
          authSource,
          serverSelectionTimeoutMS: 5000,
        } as any;
      },
    }),
    EvaluationModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
