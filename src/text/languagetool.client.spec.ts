import { LanguageToolClient } from './languagetool.client';

describe('LanguageToolClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch as any;
    jest.resetAllMocks();
  });

  it('posts text to API and returns matches', async () => {
    const mockJson = { matches: [{ message: 'Issue 1' }] };
    global.fetch = jest.fn(async () =>
      ({ ok: true, json: async () => mockJson } as any),
    ) as any;

    const client = new LanguageToolClient({ apiUrl: 'http://example/v2/check' });
    const res = await client.check({ text: 'Hello', language: 'en-US' });
    expect(res.matches).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalled();
  });

  it('throws on non-OK response', async () => {
    global.fetch = jest.fn(async () =>
      ({ ok: false, status: 500, text: async () => 'err' } as any),
    ) as any;

    const client = new LanguageToolClient({ apiUrl: 'http://example/v2/check' });
    await expect(
      client.check({ text: 'Hello', language: 'en-US' }),
    ).rejects.toThrow(/LanguageTool request failed/);
  });
});
