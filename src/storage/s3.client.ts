import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

export type S3UrlParts = {
  bucket: string;
  key: string;
  region?: string;
};

let s3Client: S3Client | undefined;

export function getS3(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }
  return s3Client;
}

// Parse s3://bucket/key or https://bucket.s3.<region>.amazonaws.com/key
export function parseS3Url(url: string): S3UrlParts | null {
  try {
    if (url.startsWith('s3://')) {
      const [, rest] = url.split('s3://');
      const [bucket, ...keyParts] = rest.split('/');
      return { bucket, key: keyParts.join('/') };
    }
    const u = new URL(url);
    if (u.protocol !== 'https:') return null;
    const host = u.hostname; // bucket.s3.region.amazonaws.com
    const hostParts = host.split('.');
    const bucket = hostParts[0];
    const region = hostParts.length >= 4 ? hostParts[2] : undefined;
    const key = u.pathname.replace(/^\//, '');
    if (!bucket || !key) return null;
    return { bucket, key, region };
  } catch {
    return null;
  }
}

export function isHttpsS3Url(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && /\.s3\./.test(u.hostname);
  } catch {
    return false;
  }
}

export async function headObjectIfEnabled(url: string): Promise<boolean> {
  const enabled =
    String(process.env.AUDIO_S3_HEAD_VALIDATE || 'false').toLowerCase() ===
    'true';
  if (!enabled) return true;
  const parts = parseS3Url(url);
  if (!parts) return false;
  const client = getS3();
  try {
    await client.send(
      new HeadObjectCommand({ Bucket: parts.bucket, Key: parts.key }),
    );
    return true;
  } catch {
    return false;
  }
}
