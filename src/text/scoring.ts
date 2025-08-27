import type { TextEvaluationResult } from '../evaluation/dto/jobs';

export interface ScoringInput {
  text: string;
  matches: Array<{ message: string }>;
}

export function computeTextScoresAndFeedback(input: ScoringInput): {
  scores: TextEvaluationResult['scores'];
  feedback: NonNullable<TextEvaluationResult['feedback']>;
} {
  const wordCount = Math.max(1, input.text.trim().split(/\s+/).length);
  const matches = input.matches.length;
  const penalty = Math.min(0.5, matches / Math.max(50, wordCount));
  const grammar = Math.max(0, 1 - penalty);
  const vocabulary = Math.max(0, 1 - penalty * 0.8);
  const coherence = Math.max(0, 1 - penalty * 0.6);
  const overall = Number(((grammar + vocabulary + coherence) / 3).toFixed(2));

  const scores: TextEvaluationResult['scores'] = {
    grammar: Number(grammar.toFixed(2)),
    vocabulary: Number(vocabulary.toFixed(2)),
    coherence: Number(coherence.toFixed(2)),
    overall,
  };
  const suggestions = input.matches.slice(0, 5).map((m) => m.message);
  const feedback: NonNullable<TextEvaluationResult['feedback']> = {
    summary:
      matches === 0
        ? 'No issues detected.'
        : `Detected ${matches} potential issue${matches === 1 ? '' : 's'}.`,
    suggestions,
  };
  return { scores, feedback };
}
