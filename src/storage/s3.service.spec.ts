import { S3Service } from './s3.service';

describe('S3Service URL validation', () => {
  const svc = new S3Service();

  it('rejects non-https URLs', () => {
    const res = svc.validateBasicUrl('http://example.com');
    expect(res.ok).toBe(false);
  });

  it('parses virtual-hosted URLs', () => {
    const out = svc.parseBucketKey('https://mybucket.s3.us-east-1.amazonaws.com/path/to/file.wav');
    expect(out).toEqual({ bucket: 'mybucket', key: 'path/to/file.wav' });
  });

  it('parses path-style URLs', () => {
    const out = svc.parseBucketKey('https://s3.amazonaws.com/mybucket/path/to/file.wav');
    expect(out).toEqual({ bucket: 'mybucket', key: 'path/to/file.wav' });
  });

  it('returns null for non-s3 hosts', () => {
    const out = svc.parseBucketKey('https://example.com/file.wav');
    expect(out).toBeNull();
  });
});
