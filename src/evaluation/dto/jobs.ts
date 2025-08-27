// Shared job payloads and results for evaluation workers

export type EvaluationType = 'text' | 'audio';

// Text evaluation
export interface TextEvaluationJobPayload {
  text: string;
  language?: string;
  rubricVersion?: string;
}

export interface TextEvaluationScores {
  grammar: number;
  vocabulary: number;
  coherence: number;
  overall: number;
}

export interface TextEvaluationResult {
  success: boolean;
  scores: TextEvaluationScores;
  feedback?: {
    summary: string;
    suggestions?: string[];
  };
}

// Audio evaluation
export interface AudioEvaluationJobPayload {
  s3Url: string;
  language?: string;
  referenceText?: string;
}

export interface AudioEvaluationScores {
  pronunciation: number;
  fluency: number;
  completeness: number;
  overall: number;
}

export interface AudioEvaluationResult {
  success: boolean;
  scores: AudioEvaluationScores;
  feedback?: {
    summary: string;
    suggestions?: string[];
  };
}
