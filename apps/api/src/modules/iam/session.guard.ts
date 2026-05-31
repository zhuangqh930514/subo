import {
  applyDecorators,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { IamService } from './iam.service';
import type { AdminSessionUser } from './iam.service';

export interface AuthenticatedRequestLike {
  headers?: Record<string, string | string[] | undefined>;
  adminSession?: AdminSessionUser;
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly iamService: IamService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequestLike>();
    const token = readBearerToken(request.headers?.authorization);

    request.adminSession = await this.iamService.getSession(token);
    return true;
  }

  static Protect() {
    return applyDecorators(UseGuards(AdminAuthGuard));
  }
}

function readBearerToken(value: string | string[] | undefined) {
  const header = Array.isArray(value) ? value[0] : value;

  if (!header) {
    throw new UnauthorizedException('请先登录后台。');
  }

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new UnauthorizedException('登录信息格式无效。');
  }

  return token.trim();
}
