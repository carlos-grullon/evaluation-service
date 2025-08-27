import { computeTextScoresAndFeedback } from './scoring';

describe('computeTextScoresAndFeedback', () => {
  it('returns perfect-ish scores when there are no matches', () => {
    const { scores, feedback } = computeTextScoresAndFeedback({
      text: 'This is a perfectly fine sentence.',
      matches: [],
    });
    expect(scores.overall).toBeGreaterThanOrEqual(0.95);
    expect(feedback.summary).toMatch(/No issues/);
  });

  it('decreases scores as matches increase', () => {
    const few = computeTextScoresAndFeedback({
      text: 'Short text for testing',
      matches: new Array(1).fill(0).map((_, i) => ({ message: `m${i}` })),
    });
    const many = computeTextScoresAndFeedback({
      text: 'Short text for testing',
      matches: new Array(10).fill(0).map((_, i) => ({ message: `m${i}` })),
    });
    expect(many.scores.overall).toBeLessThan(few.scores.overall);
    expect(many.feedback.summary).toMatch(/Detected 10/);
  });
});
