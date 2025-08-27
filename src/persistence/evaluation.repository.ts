import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { HydratedDocument, Model, UpdateResult } from 'mongoose';
import { Evaluation } from './evaluation.schema';

export type EvaluationStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

@Injectable()
export class EvaluationRepository {
  constructor(
    @InjectModel(Evaluation.name)
    private readonly model: Model<Evaluation>,
  ) {}

  async create(
    doc: Omit<Evaluation, 'error'> &
      Partial<Pick<Evaluation, 'scores' | 'feedback' | 'error'>>,
  ): Promise<{ id: string } & Evaluation> {
    const created: HydratedDocument<Evaluation> = await this.model.create(
      doc as Evaluation,
    );
    const id = String(created._id);
    const plain = created.toObject();
    return { id, ...(plain as Evaluation) };
  }

  async findById(id: string) {
    return this.model.findById(id).lean().exec();
  }

  async findByJobId(jobId: string) {
    return this.model.findOne({ jobId }).lean().exec();
  }

  async updateStatus(
    jobId: string,
    status: EvaluationStatus,
  ): Promise<UpdateResult> {
    return this.model.updateOne({ jobId }, { $set: { status } }).exec();
  }

  async markCompleted(
    jobId: string,
    scores?: unknown,
    feedback?: unknown,
  ): Promise<UpdateResult> {
    return this.model
      .updateOne({ jobId }, { $set: { status: 'completed', scores, feedback } })
      .exec();
  }

  async markFailed(jobId: string, error: string): Promise<UpdateResult> {
    return this.model
      .updateOne({ jobId }, { $set: { status: 'failed', error } })
      .exec();
  }
}
