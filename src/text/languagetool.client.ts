import 'dotenv/config';

export interface LanguageToolMatch {
  message: string;
  shortMessage?: string;
  replacements?: Array<{ value: string }>;
  offset: number;
  length: number;
  context?: { text: string; offset: number; length: number };
  rule?: {
    id: string;
    description?: string;
    issueType?: string;
    category?: { id: string; name: string };
  };
}

export interface LanguageToolResponse {
  matches: LanguageToolMatch[];
}

export class LanguageToolClient {
  private readonly apiUrl: string;
  private readonly apiKey?: string;

  constructor(opts?: { apiUrl?: string; apiKey?: string }) {
    this.apiUrl =
      opts?.apiUrl ??
      process.env.LANGUAGETOOL_API_URL ??
      'https://api.languagetool.org/v2/check';
    this.apiKey = opts?.apiKey ?? process.env.LANGUAGETOOL_API_KEY;
  }

  async check(params: {
    text: string;
    language?: string;
  }): Promise<LanguageToolResponse> {
    const body = new URLSearchParams();
    body.set('text', params.text);
    body.set('language', params.language || 'en-US');
    if (this.apiKey) body.set('apiKey', this.apiKey);

    const res = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`LanguageTool request failed: ${res.status} ${t}`);
    }
    const json = (await res.json()) as LanguageToolResponse;
    return json;
  }
}
