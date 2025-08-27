import { Injectable, Logger } from '@nestjs/common';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3: S3Client;
  private readonly bucket?: string;

  constructor() {
    const region = process.env.AWS_REGION;
    this.bucket = process.env.AWS_S3_BUCKET;
    this.s3 = new S3Client({ region });
  }

  // Basic checks: https URL and optional bucket allowlist
  validateBasicUrl(s3Url: string): { ok: boolean; reason?: string } {
    try {
      const u = new URL(s3Url);
      if (u.protocol !== 'https:') return { ok: false, reason: 's3Url must be https' };
      if (this.bucket) {
        const host = u.hostname;
        const path = u.pathname.replace(/^\/+/, '');
        const isVirtualHosted = host.startsWith(`${this.bucket}.`);
        const isPathStyle = path.startsWith(`${this.bucket}/`);
        if (!isVirtualHosted && !isPathStyle) {
          return { ok: false, reason: `s3Url bucket must be ${this.bucket}` };
        }
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: 'invalid URL' };
    }
  }

  // Optional HEAD validation to confirm object exists. Returns true if accessible.
  async headValidate(s3Url: string): Promise<{ ok: boolean; reason?: string }> {
    try {
      const parsed = this.parseBucketKey(s3Url);
      if (!parsed) return { ok: false, reason: 'unable to parse bucket/key from url' };
      const { bucket, key } = parsed;
      await this.s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return { ok: true };
    } catch (err: any) {
      this.logger.warn(`HEAD validation failed: ${err?.name || err}`);
      return { ok: false, reason: String(err?.name || err?.message || err) };
    }
  }

  // Parse S3 bucket/key from typical virtual-hosted and path-style URLs
  parseBucketKey(s3Url: string): { bucket: string; key: string } | null {
    try {
      const u = new URL(s3Url);
      const host = u.hostname;
      const path = u.pathname.replace(/^\/+/, '');

      // virtual-hosted-style: bucket.s3.amazonaws.com/key or bucket.s3.<region>.amazonaws.com/key
      const vhMatch = host.match(/^(?<bucket>[^.]+)\.s3[.-][^.]+\.amazonaws\.com$/) || host.match(/^(?<bucket>[^.]+)\.s3\.amazonaws\.com$/);
      if (vhMatch && vhMatch.groups?.bucket) {
        return { bucket: vhMatch.groups.bucket, key: decodeURIComponent(path) };
      }

      // path-style: s3.amazonaws.com/bucket/key or s3.<region>.amazonaws.com/bucket/key
      const pathStyleHost = host.includes('s3.amazonaws.com') || /s3[.-][^.]+\.amazonaws\.com$/.test(host);
      if (pathStyleHost) {
        const [bucket, ...rest] = path.split('/');
        if (!bucket) return null;
        return { bucket, key: decodeURIComponent(rest.join('/')) };
      }

      return null;
    } catch {
      return null;
    }
  }
}
