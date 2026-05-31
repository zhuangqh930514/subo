import { Body, Controller, Get, Post } from '@nestjs/common';

import { AdminSession } from './session.decorator';
import { AdminSessionUser, IamService } from './iam.service';
import { AdminAuthGuard } from './session.guard';

export interface AdminLoginPayload {
  username?: string;
  password?: string;
}

@Controller(['iam', 'admin/auth'])
export class IamController {
  constructor(private readonly iamService: IamService) {}

  @Post('login')
  login(@Body() payload: AdminLoginPayload) {
    return this.iamService.login(payload?.username ?? '', payload?.password ?? '');
  }

  @Get('me')
  @AdminAuthGuard.Protect()
  async me(@AdminSession() session: AdminSessionUser) {
    return {
      authenticated: true,
      user: session,
    };
  }
}
