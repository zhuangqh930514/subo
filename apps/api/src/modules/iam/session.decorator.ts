import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { AuthenticatedRequestLike } from './session.guard';

export const AdminSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequestLike>();
    return request.adminSession;
  },
);
