import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { AdminUserStatus } from '@prisma/client';

import { AdminSession } from './session.decorator';
import {
  type AdminRequestContext,
  type AdminSessionUser,
  IamService,
} from './iam.service';
import { AdminAuthGuard, type AuthenticatedRequestLike } from './session.guard';

@Controller('admin/iam')
@AdminAuthGuard.Protect()
export class AdminIamController {
  constructor(private readonly iamService: IamService) {}

  @Get('overview')
  overview(@AdminSession() session: AdminSessionUser) {
    this.iamService.assertSessionPermission(session, 'iam.users.manage');
    return this.iamService.getOverview();
  }

  @Get('users')
  listUsers(
    @Query('search') search: string | undefined,
    @Query('status') status: string | undefined,
    @Query('page') page: string | undefined,
    @Query('pageSize') pageSize: string | undefined,
    @AdminSession() session: AdminSessionUser,
  ) {
    this.iamService.assertSessionPermission(session, 'iam.users.manage');
    return this.iamService.listAdminUsers({
      search: parseOptionalText(search),
      status: parseAdminUserStatus(status),
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @Get('roles')
  listRoles(@AdminSession() session: AdminSessionUser) {
    this.iamService.assertSessionPermission(session, 'iam.users.manage');
    return this.iamService.listRoles();
  }

  @Get('logs')
  listLogs(
    @Query('limit') limit: string | undefined,
    @AdminSession() session: AdminSessionUser,
  ) {
    this.iamService.assertSessionPermission(session, 'iam.users.manage');
    return this.iamService.listActionLogs(parseLimit(limit, 20));
  }

  @Post('users')
  createUser(
    @Body() payload: Record<string, unknown>,
    @AdminSession() session: AdminSessionUser,
    @Req() request: AuthenticatedRequestLike,
  ) {
    return this.iamService.createAdminUser(
      parseSaveAdminUserPayload(payload, true),
      session,
      extractRequestContext(request),
    );
  }

  @Put('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() payload: Record<string, unknown>,
    @AdminSession() session: AdminSessionUser,
    @Req() request: AuthenticatedRequestLike,
  ) {
    return this.iamService.updateAdminUser(
      parsePositiveInt(id, 'id'),
      parseSaveAdminUserPayload(payload, false),
      session,
      extractRequestContext(request),
    );
  }

  @Patch('users/:id/status')
  updateUserStatus(
    @Param('id') id: string,
    @Body() payload: Record<string, unknown>,
    @AdminSession() session: AdminSessionUser,
    @Req() request: AuthenticatedRequestLike,
  ) {
    return this.iamService.setAdminUserStatus(
      parsePositiveInt(id, 'id'),
      parseRequiredAdminUserStatus(payload.status),
      session,
      extractRequestContext(request),
    );
  }

  @Post('users/:id/reset-password')
  resetPassword(
    @Param('id') id: string,
    @Body() payload: Record<string, unknown>,
    @AdminSession() session: AdminSessionUser,
    @Req() request: AuthenticatedRequestLike,
  ) {
    return this.iamService.resetAdminUserPassword(
      parsePositiveInt(id, 'id'),
      parseOptionalText(payload.password),
      session,
      extractRequestContext(request),
    );
  }

  @Delete('users/:id')
  deleteUser(
    @Param('id') id: string,
    @AdminSession() session: AdminSessionUser,
    @Req() request: AuthenticatedRequestLike,
  ) {
    return this.iamService.deleteAdminUser(
      parsePositiveInt(id, 'id'),
      session,
      extractRequestContext(request),
    );
  }
}

function parseSaveAdminUserPayload(
  input: Record<string, unknown>,
  requirePassword: boolean,
) {
  const password = parseOptionalText(input.password);
  const roleIds = parseRoleIds(input.roleIds);

  if (requirePassword && !password) {
    throw new BadRequestException('password 不能为空。');
  }

  if (roleIds.length === 0) {
    throw new BadRequestException('至少分配一个角色。');
  }

  return {
    username: parseRequiredText(input.username, 'username'),
    nickname: parseOptionalText(input.nickname),
    email: parseOptionalText(input.email),
    phone: parseOptionalText(input.phone),
    roleIds,
    password,
  };
}

function parseRoleIds(value: unknown) {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new BadRequestException('roleIds 必须是数组。');
  }

  return [...new Set(value.map((item) => parsePositiveUnknownInt(item, 'roleIds')))];
}

function parsePositiveInt(value: string, fieldName: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException(`${fieldName} 必须是正整数。`);
  }

  return parsed;
}

function parsePositiveUnknownInt(value: unknown, fieldName: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException(`${fieldName} 必须全部是正整数。`);
  }

  return parsed;
}

function parseRequiredText(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new BadRequestException(`${fieldName} 不能为空。`);
  }

  return value.trim();
}

function parseOptionalText(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('文本字段必须是字符串。');
  }

  const normalized = value.trim();
  return normalized || undefined;
}

function parseAdminUserStatus(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return parseRequiredAdminUserStatus(value);
}

function parseRequiredAdminUserStatus(value: unknown) {
  if (typeof value !== 'string') {
    throw new BadRequestException('status 仅支持 active 或 disabled。');
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === 'active') {
    return AdminUserStatus.ACTIVE;
  }

  if (normalized === 'disabled') {
    return AdminUserStatus.DISABLED;
  }

  throw new BadRequestException('status 仅支持 active 或 disabled。');
}

function parsePage(value?: string) {
  if (!value) {
    return 1;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException('page 必须是大于 0 的整数。');
  }

  return parsed;
}

function parsePageSize(value?: string) {
  if (!value) {
    return 10;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException('pageSize 必须是大于 0 的整数。');
  }

  return Math.min(parsed, 100);
}

function parseLimit(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException('limit 必须是大于 0 的整数。');
  }

  return Math.min(parsed, 50);
}

function extractRequestContext(
  request: AuthenticatedRequestLike & {
    ip?: string;
    socket?: {
      remoteAddress?: string;
    };
  },
): AdminRequestContext {
  const forwardedFor = request.headers?.['x-forwarded-for'];
  const userAgent = request.headers?.['user-agent'];

  return {
    ipAddress: firstHeaderValue(forwardedFor) ?? request.ip ?? request.socket?.remoteAddress,
    userAgent: firstHeaderValue(userAgent),
  };
}

function firstHeaderValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}
