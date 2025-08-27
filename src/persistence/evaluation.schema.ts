import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EvaluationDocument = HydratedDocument<Evaluation>;

@Schema({ timestamps: true })
export class Evaluation {
  @Prop({ required: true, enum: ['text', 'audio'] })
  type!: 'text' | 'audio';

  @Prop({ required: true })
  jobId!: string;

  @Prop({ type: Object, required: true })
  input!: {
    text?: string;
    s3Url?: string;
    language?: string;
    referenceText?: string;
    meta?: Record<string, any>;
  };

  @Prop({
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  })
  status!: 'pending' | 'processing' | 'completed' | 'failed';

  @Prop({ type: Object })
  scores?: any;

  @Prop({ type: Object })
  feedback?: any;

  @Prop()
  error?: string;
}

export const EvaluationSchema = SchemaFactory.createForClass(Evaluation);
