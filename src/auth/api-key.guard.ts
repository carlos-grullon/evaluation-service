import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly headerName = 'x-api-key';
  private readonly expected = process.env.API_KEY;

  canActivate(context: ExecutionContext): boolean {
    if (!this.expected) {
      // If no API_KEY configured, allow all (development convenience)
      return true;
    }

    const req = context
      .switchToHttp()
      .getRequest<Request & { headers: Record<string, string | undefined> }>();
    const headerKey =
      req.headers[this.headerName] ||
      req.headers[this.headerName.toLowerCase()];

    // Also support Authorization: ApiKey <key>
    const authHeader = req.headers['authorization'];
    const token =
      typeof authHeader === 'string' && authHeader.startsWith('ApiKey ')
        ? authHeader.slice('ApiKey '.length)
        : undefined;

    const provided = (headerKey as string) || token;

    if (!provided || provided !== this.expected) {
      throw new UnauthorizedException('Invalid or missing API key');
    }

    return true;
  }
}
