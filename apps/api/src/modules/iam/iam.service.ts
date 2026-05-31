import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AdminUserStatus,
  Prisma,
  RecordStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import {
  ADMIN_PERMISSION_GROUPS,
  BUILT_IN_ADMIN_ROLES,
  type AdminPermissionGroup,
  resolvePermissionLabel,
} from './permissions';

const ADMIN_TOKEN_TTL_SECONDS = 60 * 60 * 12;
const ADMIN_AUTH_SECRET =
  process.env.ADMIN_AUTH_SECRET ?? 'subo-admin-dev-secret-change-me';
const FALLBACK_ADMIN_USERNAME =
  process.env.ADMIN_BOOTSTRAP_USERNAME ?? 'admin';
const FALLBACK_ADMIN_PASSWORD =
  process.env.ADMIN_BOOTSTRAP_PASSWORD ?? 'admin123';
const FALLBACK_ADMIN_NICKNAME =
  process.env.ADMIN_BOOTSTRAP_NICKNAME ?? '系统管理员';

const DEFAULT_RESET_PASSWORD =
  process.env.ADMIN_DEFAULT_RESET_PASSWORD ?? 'Subo123456';

export interface AdminSessionUser {
  id: string;
  username: string;
  displayName: string;
  nickname: string;
  roles: string[];
  roleCodes: string[];
  permissions: string[];
  source: 'database' | 'bootstrap';
}

export interface AdminLoginResponse {
  token: string;
  expiresAt: string;
  user: AdminSessionUser;
}

export interface AdminUserListQuery {
  search?: string;
  status?: AdminUserStatus;
  page: number;
  pageSize: number;
}

export interface SaveAdminUserPayload {
  username: string;
  nickname?: string;
  email?: string;
  phone?: string;
  roleIds: number[];
  password?: string;
}

export interface AdminRequestContext {
  ipAddress?: string;
  userAgent?: string;
}

interface AdminTokenPayload {
  sub: string;
  username: string;
  nickname: string;
  source: 'database' | 'bootstrap';
  exp: number;
}

type ManagedAdminUser = Awaited<ReturnType<IamService['findManagedUserById']>>;
type RoleCatalogRecord = Awaited<ReturnType<IamService['listRoles']>>['records'][number];

@Injectable()
export class IamService {
  constructor(private readonly prisma: PrismaService) {}

  async login(username: string, password: string): Promise<AdminLoginResponse> {
    const normalizedUsername = username.trim();
    const normalizedPassword = password.trim();

    if (!normalizedUsername || !normalizedPassword) {
      throw new UnauthorizedException('账号或密码错误。');
    }

    const databaseUser = await this.resolveDatabaseUser(
      normalizedUsername,
      normalizedPassword,
    );

    if (databaseUser) {
      return this.createLoginResponse(databaseUser);
    }

    if (
      normalizedUsername === FALLBACK_ADMIN_USERNAME &&
      normalizedPassword === FALLBACK_ADMIN_PASSWORD
    ) {
      return this.createLoginResponse(this.buildBootstrapSessionUser());
    }

    throw new UnauthorizedException('账号或密码错误。');
  }

  async getSession(token: string): Promise<AdminSessionUser> {
    const payload = this.verifyToken(token);

    if (payload.source === 'bootstrap') {
      return this.buildBootstrapSessionUser();
    }

    const session = await this.loadDatabaseSessionUser(payload.sub);
    if (!session) {
      throw new UnauthorizedException('账号状态已变更，请重新登录。');
    }

    return session;
  }

  assertSessionPermission(
    session: AdminSessionUser | undefined,
    permissionKey: string,
  ) {
    if (!session) {
      throw new UnauthorizedException('请先登录后台。');
    }

    if (
      session.source === 'bootstrap' ||
      session.permissions.includes(permissionKey)
    ) {
      return;
    }

    throw new ForbiddenException('当前账号没有执行该操作的权限。');
  }

  async getOverview() {
    const [roles, recentLogs, summary] = await Promise.all([
      this.listRoles(),
      this.listActionLogs(12),
      this.getOverviewSummary(),
    ]);

    return {
      demoMode: !this.prisma.isConfigured,
      summary: {
        totalUsers: summary.totalUsers,
        activeUsers: summary.activeUsers,
        disabledUsers: summary.disabledUsers,
        roleCount: roles.records.length,
        recentLogCount: recentLogs.records.length,
      },
      permissionGroups: ADMIN_PERMISSION_GROUPS,
      roles: roles.records,
      recentLogs: recentLogs.records,
    };
  }

  async listAdminUsers(query: AdminUserListQuery) {
    if (!this.prisma.isConfigured) {
      const bootstrapUser = this.buildFallbackManagedUserRecord();
      const filtered = this.filterFallbackUsers([bootstrapUser], query);
      return {
        demoMode: true,
        page: query.page,
        pageSize: query.pageSize,
        total: filtered.length,
        records: filtered.slice(
          (query.page - 1) * query.pageSize,
          query.page * query.pageSize,
        ),
      };
    }

    await this.ensureBuiltInRoles();

    const where: Prisma.AdminUserWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { username: { contains: query.search } },
              { nickname: { contains: query.search } },
              { email: { contains: query.search } },
              { phone: { contains: query.search } },
            ],
          }
        : {}),
    };

    const skip = (query.page - 1) * query.pageSize;
    const [total, users] = await Promise.all([
      this.prisma.adminUser.count({ where }),
      this.prisma.adminUser.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: query.pageSize,
        select: {
          id: true,
          username: true,
          nickname: true,
          email: true,
          phone: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          roles: {
            orderBy: [{ role: { name: 'asc' } }, { roleId: 'asc' }],
            select: {
              role: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  description: true,
                  status: true,
                  isBuiltIn: true,
                  createdAt: true,
                  updatedAt: true,
                  _count: {
                    select: {
                      users: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      demoMode: false,
      page: query.page,
      pageSize: query.pageSize,
      total,
      records: users.map((user) => this.mapManagedUserRecord(user)),
    };
  }

  async listRoles() {
    if (!this.prisma.isConfigured) {
      return {
        demoMode: true,
        records: BUILT_IN_ADMIN_ROLES.map((role, index) =>
          this.mapRoleRecord({
            id: index + 1,
            code: role.code,
            name: role.name,
            description: role.description,
            status: RecordStatus.ACTIVE,
            isBuiltIn: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: {
              users: role.code === 'super_admin' ? 1 : 0,
            },
          }),
        ),
      };
    }

    await this.ensureBuiltInRoles();

    const roles = await this.prisma.adminRole.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: [{ isBuiltIn: 'desc' }, { id: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        status: true,
        isBuiltIn: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    return {
      demoMode: false,
      records: roles.map((role) => this.mapRoleRecord(role)),
    };
  }

  async listActionLogs(limit = 20) {
    if (!this.prisma.isConfigured) {
      return {
        demoMode: true,
        records: [],
      };
    }

    const logs = await this.prisma.adminActionLog.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        targetLabel: true,
        summary: true,
        detail: true,
        actorUsername: true,
        actorDisplayName: true,
        createdAt: true,
      },
    });

    return {
      demoMode: false,
      records: logs.map((log) => ({
        id: String(log.id),
        action: log.action,
        actionLabel: this.resolveActionLabel(log.action),
        targetType: log.targetType,
        targetId: log.targetId ?? '',
        targetLabel: log.targetLabel ?? '',
        summary: log.summary,
        actorUsername: log.actorUsername,
        actorDisplayName: log.actorDisplayName?.trim() || log.actorUsername,
        createdAt: log.createdAt.toISOString(),
        createdAtLabel: formatDateTime(log.createdAt),
        detail: isPlainRecord(log.detail) ? log.detail : undefined,
      })),
    };
  }

  async createAdminUser(
    payload: SaveAdminUserPayload,
    actor: AdminSessionUser | undefined,
    context: AdminRequestContext,
  ) {
    this.assertDatabaseWritable();
    this.assertSessionPermission(actor, 'iam.users.manage');
    await this.ensureBuiltInRoles();

    const roleIds = await this.resolveActiveRoleIds(payload.roleIds);
    const normalizedUsername = payload.username.trim();

    const existing = await this.prisma.adminUser.findFirst({
      where: {
        username: normalizedUsername,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new ForbiddenException('该用户名已存在，请更换后再试。');
    }

    const actorId = parseSessionUserId(actor);
    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.adminUser.create({
        data: {
          username: normalizedUsername,
          passwordHash: hashPassword(payload.password ?? DEFAULT_RESET_PASSWORD),
          nickname: normalizeOptionalText(payload.nickname),
          email: normalizeOptionalText(payload.email),
          phone: normalizeOptionalText(payload.phone),
          status: AdminUserStatus.ACTIVE,
          createdBy: actorId,
          updatedBy: actorId,
        },
        select: {
          id: true,
        },
      });

      await this.replaceUserRoles(tx, user.id, roleIds, actorId);

      const managedUser = await this.findManagedUserById(user.id, tx);
      if (!managedUser) {
        throw new NotFoundException('新建管理员后读取记录失败。');
      }

      await this.recordActionLog(tx, {
        actor,
        action: 'admin_user_created',
        targetType: 'admin_user',
        targetId: String(user.id),
        targetLabel: managedUser.displayName,
        summary: `创建管理员 ${managedUser.displayName}。`,
        detail: {
          username: managedUser.username,
          roleCodes: managedUser.roles.map((role) => role.code),
        },
        context,
      });

      return managedUser;
    });

    return {
      message: '管理员已创建。',
      record: created,
    };
  }

  async updateAdminUser(
    id: number,
    payload: SaveAdminUserPayload,
    actor: AdminSessionUser | undefined,
    context: AdminRequestContext,
  ) {
    this.assertDatabaseWritable();
    this.assertSessionPermission(actor, 'iam.users.manage');
    await this.ensureBuiltInRoles();

    const existing = await this.findManagedUserById(id);
    if (!existing) {
      throw new NotFoundException(`未找到 ID=${id} 的管理员。`);
    }

    const roleIds = await this.resolveActiveRoleIds(payload.roleIds);
    const normalizedUsername = payload.username.trim();
    const actorId = parseSessionUserId(actor);

    const duplicate = await this.prisma.adminUser.findFirst({
      where: {
        username: normalizedUsername,
        deletedAt: null,
        id: {
          not: id,
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicate) {
      throw new ForbiddenException('该用户名已存在，请更换后再试。');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.adminUser.update({
        where: {
          id,
        },
        data: {
          username: normalizedUsername,
          nickname: normalizeOptionalText(payload.nickname),
          email: normalizeOptionalText(payload.email),
          phone: normalizeOptionalText(payload.phone),
          updatedBy: actorId,
        },
      });

      await this.replaceUserRoles(tx, id, roleIds, actorId);

      const managedUser = await this.findManagedUserById(id, tx);
      if (!managedUser) {
        throw new NotFoundException(`未找到 ID=${id} 的管理员。`);
      }

      await this.recordActionLog(tx, {
        actor,
        action: 'admin_user_updated',
        targetType: 'admin_user',
        targetId: String(id),
        targetLabel: managedUser.displayName,
        summary: `更新管理员 ${managedUser.displayName} 的资料与角色。`,
        detail: {
          before: {
            username: existing.username,
            nickname: existing.nickname,
            email: existing.email,
            phone: existing.phone,
            roleCodes: existing.roles.map((role) => role.code),
          },
          after: {
            username: managedUser.username,
            nickname: managedUser.nickname,
            email: managedUser.email,
            phone: managedUser.phone,
            roleCodes: managedUser.roles.map((role) => role.code),
          },
        },
        context,
      });

      return managedUser;
    });

    return {
      message: '管理员资料已更新。',
      record: updated,
    };
  }

  async setAdminUserStatus(
    id: number,
    status: AdminUserStatus,
    actor: AdminSessionUser | undefined,
    context: AdminRequestContext,
  ) {
    this.assertDatabaseWritable();
    this.assertSessionPermission(actor, 'iam.users.manage');

    if (actor?.source === 'database' && actor.id === String(id) && status !== AdminUserStatus.ACTIVE) {
      throw new ForbiddenException('不能停用当前登录账号。');
    }

    const existing = await this.findManagedUserById(id);
    if (!existing) {
      throw new NotFoundException(`未找到 ID=${id} 的管理员。`);
    }

    const actorId = parseSessionUserId(actor);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.adminUser.update({
        where: {
          id,
        },
        data: {
          status,
          updatedBy: actorId,
        },
      });

      const managedUser = await this.findManagedUserById(id, tx);
      if (!managedUser) {
        throw new NotFoundException(`未找到 ID=${id} 的管理员。`);
      }

      await this.recordActionLog(tx, {
        actor,
        action: status === AdminUserStatus.ACTIVE ? 'admin_user_enabled' : 'admin_user_disabled',
        targetType: 'admin_user',
        targetId: String(id),
        targetLabel: managedUser.displayName,
        summary:
          status === AdminUserStatus.ACTIVE
            ? `启用管理员 ${managedUser.displayName}。`
            : `停用管理员 ${managedUser.displayName}。`,
        detail: {
          status: mapAdminUserStatus(status),
        },
        context,
      });

      return managedUser;
    });

    return {
      message:
        status === AdminUserStatus.ACTIVE ? '管理员已启用。' : '管理员已停用。',
      record: updated,
    };
  }

  async resetAdminUserPassword(
    id: number,
    nextPassword: string | undefined,
    actor: AdminSessionUser | undefined,
    context: AdminRequestContext,
  ) {
    this.assertDatabaseWritable();
    this.assertSessionPermission(actor, 'iam.users.manage');

    const existing = await this.findManagedUserById(id);
    if (!existing) {
      throw new NotFoundException(`未找到 ID=${id} 的管理员。`);
    }

    const password = (nextPassword?.trim() || DEFAULT_RESET_PASSWORD).trim();
    const actorId = parseSessionUserId(actor);

    await this.prisma.$transaction(async (tx) => {
      await tx.adminUser.update({
        where: {
          id,
        },
        data: {
          passwordHash: hashPassword(password),
          updatedBy: actorId,
        },
      });

      await this.recordActionLog(tx, {
        actor,
        action: 'admin_user_password_reset',
        targetType: 'admin_user',
        targetId: String(id),
        targetLabel: existing.displayName,
        summary: `重置管理员 ${existing.displayName} 的密码。`,
        detail: {
          resetToCustomPassword: password !== DEFAULT_RESET_PASSWORD,
        },
        context,
      });
    });

    return {
      message: '密码已重置。',
      password,
    };
  }

  async deleteAdminUser(
    id: number,
    actor: AdminSessionUser | undefined,
    context: AdminRequestContext,
  ) {
    this.assertDatabaseWritable();
    this.assertSessionPermission(actor, 'iam.users.manage');

    if (actor?.source === 'database' && actor.id === String(id)) {
      throw new ForbiddenException('不能删除当前登录账号。');
    }

    const existing = await this.findManagedUserById(id);
    if (!existing) {
      throw new NotFoundException(`未找到 ID=${id} 的管理员。`);
    }

    const actorId = parseSessionUserId(actor);

    await this.prisma.$transaction(async (tx) => {
      await tx.adminUserRole.deleteMany({
        where: {
          userId: id,
        },
      });

      await tx.adminUser.update({
        where: {
          id,
        },
        data: {
          username: buildDeletedUsername(existing.username, id),
          status: AdminUserStatus.DISABLED,
          deletedAt: new Date(),
          updatedBy: actorId,
        },
      });

      await this.recordActionLog(tx, {
        actor,
        action: 'admin_user_deleted',
        targetType: 'admin_user',
        targetId: String(id),
        targetLabel: existing.displayName,
        summary: `删除管理员 ${existing.displayName}。`,
        detail: {
          username: existing.username,
          roleCodes: existing.roles.map((role) => role.code),
        },
        context,
      });
    });

    return {
      message: '管理员已删除。',
    };
  }

  private async resolveDatabaseUser(username: string, password: string) {
    if (!this.prisma.isConfigured) {
      return null;
    }

    await this.ensureBuiltInRoles();

    const user = await this.prisma.adminUser.findFirst({
      where: {
        username,
        deletedAt: null,
      },
      select: {
        id: true,
        username: true,
        nickname: true,
        passwordHash: true,
        status: true,
        roles: {
          orderBy: [{ role: { name: 'asc' } }, { roleId: 'asc' }],
          select: {
            role: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== AdminUserStatus.ACTIVE) {
      return null;
    }

    if (!matchesPassword(password, user.passwordHash)) {
      return null;
    }

    await this.prisma.adminUser.update({
      where: {
        id: user.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });

    return this.buildDatabaseSessionUser(user);
  }

  private async loadDatabaseSessionUser(userId: string) {
    if (!this.prisma.isConfigured) {
      return null;
    }

    await this.ensureBuiltInRoles();

    const parsedUserId = Number(userId);
    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      return null;
    }

    const user = await this.prisma.adminUser.findFirst({
      where: {
        id: parsedUserId,
        deletedAt: null,
      },
      select: {
        id: true,
        username: true,
        nickname: true,
        status: true,
        roles: {
          orderBy: [{ role: { name: 'asc' } }, { roleId: 'asc' }],
          select: {
            role: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== AdminUserStatus.ACTIVE) {
      return null;
    }

    return this.buildDatabaseSessionUser(user);
  }

  private buildBootstrapSessionUser(): AdminSessionUser {
    const definition = BUILT_IN_ADMIN_ROLES.find(
      (role) => role.code === 'super_admin',
    );

    return {
      id: 'bootstrap-admin',
      username: FALLBACK_ADMIN_USERNAME,
      displayName: FALLBACK_ADMIN_NICKNAME,
      nickname: FALLBACK_ADMIN_NICKNAME,
      roles: definition ? [definition.name] : ['超级管理员'],
      roleCodes: definition ? [definition.code] : ['super_admin'],
      permissions: definition ? [...definition.permissionKeys] : [],
      source: 'bootstrap',
    };
  }

  private buildDatabaseSessionUser(user: {
    id: number;
    username: string;
    nickname: string | null;
    roles: Array<{
      role: {
        code: string;
        name: string;
      };
    }>;
  }): AdminSessionUser {
    const roleCodes = user.roles.map((item) => item.role.code);
    const permissionSet = new Set<string>();

    for (const code of roleCodes) {
      const definition = BUILT_IN_ADMIN_ROLES.find((item) => item.code === code);
      for (const permission of definition?.permissionKeys ?? []) {
        permissionSet.add(permission);
      }
    }

    const nickname = user.nickname?.trim() || user.username;

    return {
      id: String(user.id),
      username: user.username,
      displayName: nickname,
      nickname,
      roles: user.roles.map((item) => item.role.name),
      roleCodes,
      permissions: [...permissionSet],
      source: 'database',
    };
  }

  private createLoginResponse(user: AdminSessionUser): AdminLoginResponse {
    const expiresAt = new Date(Date.now() + ADMIN_TOKEN_TTL_SECONDS * 1000);
    const payload: AdminTokenPayload = {
      sub: user.id,
      username: user.username,
      nickname: user.nickname,
      source: user.source,
      exp: Math.floor(expiresAt.getTime() / 1000),
    };

    return {
      token: signToken(payload),
      expiresAt: expiresAt.toISOString(),
      user,
    };
  }

  private verifyToken(token: string): AdminTokenPayload {
    const [encodedPayload, encodedSignature] = token.split('.');
    if (!encodedPayload || !encodedSignature) {
      throw new UnauthorizedException('登录态无效，请重新登录。');
    }

    const expectedSignature = createSignature(encodedPayload);
    if (!safeEqual(encodedSignature, expectedSignature)) {
      throw new UnauthorizedException('登录态无效，请重新登录。');
    }

    let payload: AdminTokenPayload;

    try {
      payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as AdminTokenPayload;
    } catch {
      throw new UnauthorizedException('登录态无效，请重新登录。');
    }

    if (!payload?.sub || !payload.username || !payload.exp) {
      throw new UnauthorizedException('登录态无效，请重新登录。');
    }

    if (payload.exp * 1000 <= Date.now()) {
      throw new UnauthorizedException('登录已过期，请重新登录。');
    }

    return payload;
  }

  private async ensureBuiltInRoles() {
    if (!this.prisma.isConfigured) {
      return;
    }

    await Promise.all(
      BUILT_IN_ADMIN_ROLES.map((role) =>
        this.prisma.adminRole.upsert({
          where: {
            code: role.code,
          },
          create: {
            code: role.code,
            name: role.name,
            description: role.description,
            status: RecordStatus.ACTIVE,
            isBuiltIn: true,
          },
          update: {
            name: role.name,
            description: role.description,
            status: RecordStatus.ACTIVE,
            isBuiltIn: true,
            deletedAt: null,
          },
        }),
      ),
    );
  }

  private async getOverviewSummary() {
    if (!this.prisma.isConfigured) {
      return {
        totalUsers: 1,
        activeUsers: 1,
        disabledUsers: 0,
      };
    }

    const [totalUsers, activeUsers, disabledUsers] = await Promise.all([
      this.prisma.adminUser.count({
        where: {
          deletedAt: null,
        },
      }),
      this.prisma.adminUser.count({
        where: {
          deletedAt: null,
          status: AdminUserStatus.ACTIVE,
        },
      }),
      this.prisma.adminUser.count({
        where: {
          deletedAt: null,
          status: AdminUserStatus.DISABLED,
        },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      disabledUsers,
    };
  }

  private async resolveActiveRoleIds(roleIds: number[]) {
    if (roleIds.length === 0) {
      return [];
    }

    const uniqueRoleIds = [...new Set(roleIds)];
    const roles = await this.prisma.adminRole.findMany({
      where: {
        id: {
          in: uniqueRoleIds,
        },
        deletedAt: null,
        status: RecordStatus.ACTIVE,
      },
      select: {
        id: true,
      },
    });

    if (roles.length !== uniqueRoleIds.length) {
      throw new NotFoundException('存在不可分配的角色，请刷新页面后重试。');
    }

    return uniqueRoleIds;
  }

  private async replaceUserRoles(
    tx: Prisma.TransactionClient,
    userId: number,
    roleIds: number[],
    actorId?: number,
  ) {
    await tx.adminUserRole.deleteMany({
      where: {
        userId,
      },
    });

    if (roleIds.length === 0) {
      return;
    }

    await tx.adminUserRole.createMany({
      data: roleIds.map((roleId) => ({
        userId,
        roleId,
        assignedBy: actorId,
      })),
      skipDuplicates: true,
    });
  }

  private async findManagedUserById(
    id: number,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const user = await client.adminUser.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        username: true,
        nickname: true,
        email: true,
        phone: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          orderBy: [{ role: { name: 'asc' } }, { roleId: 'asc' }],
          select: {
            role: {
              select: {
                id: true,
                code: true,
                name: true,
                description: true,
                status: true,
                isBuiltIn: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                  select: {
                    users: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return this.mapManagedUserRecord(user);
  }

  private mapManagedUserRecord(user: {
    id: number;
    username: string;
    nickname: string | null;
    email: string | null;
    phone: string | null;
    status: AdminUserStatus;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    roles: Array<{
      role: {
        id: number;
        code: string;
        name: string;
        description: string | null;
        status: RecordStatus;
        isBuiltIn: boolean;
        createdAt: Date;
        updatedAt: Date;
        _count: {
          users: number;
        };
      };
    }>;
  }) {
    const roles = user.roles.map((item) => this.mapRoleRecord(item.role));
    const nickname = user.nickname?.trim() || '';
    const displayName = nickname || user.username;

    return {
      id: String(user.id),
      username: user.username,
      nickname,
      displayName,
      email: user.email?.trim() || '',
      phone: user.phone?.trim() || '',
      status: mapAdminUserStatus(user.status),
      statusLabel: user.status === AdminUserStatus.ACTIVE ? '启用中' : '已停用',
      roles: roles.map((role) => ({
        id: role.id,
        code: role.code,
        name: role.name,
      })),
      roleIds: roles.map((role) => role.id),
      permissions: uniqueStrings(
        roles.flatMap((role) => role.permissions.map((permission) => permission.key)),
      ),
      lastLoginAt: user.lastLoginAt?.toISOString(),
      lastLoginAtLabel: formatDateTime(user.lastLoginAt),
      createdAt: user.createdAt.toISOString(),
      createdAtLabel: formatDateTime(user.createdAt),
      updatedAt: user.updatedAt.toISOString(),
      updatedAtLabel: formatDateTime(user.updatedAt),
    };
  }

  private mapRoleRecord(role: {
    id: number;
    code: string;
    name: string;
    description: string | null;
    status: RecordStatus;
    isBuiltIn: boolean;
    createdAt: Date;
    updatedAt: Date;
    _count: {
      users: number;
    };
  }) {
    const definition = BUILT_IN_ADMIN_ROLES.find((item) => item.code === role.code);
    const permissionKeys = definition?.permissionKeys ?? [];

    return {
      id: String(role.id),
      code: role.code,
      name: role.name,
      description: role.description?.trim() || '',
      status: mapRecordStatus(role.status),
      statusLabel:
        role.status === RecordStatus.ACTIVE
          ? '启用中'
          : role.status === RecordStatus.INACTIVE
            ? '已停用'
            : '已归档',
      isBuiltIn: role.isBuiltIn,
      memberCount: role._count.users,
      permissions: permissionKeys.map((key) => ({
        key,
        label: resolvePermissionLabel(key),
      })),
      createdAt: role.createdAt.toISOString(),
      createdAtLabel: formatDateTime(role.createdAt),
      updatedAt: role.updatedAt.toISOString(),
      updatedAtLabel: formatDateTime(role.updatedAt),
    };
  }

  private buildFallbackManagedUserRecord() {
    const fallbackRole = BUILT_IN_ADMIN_ROLES.find(
      (role) => role.code === 'super_admin',
    );
    const now = new Date();

    return {
      id: 'bootstrap-admin',
      username: FALLBACK_ADMIN_USERNAME,
      nickname: FALLBACK_ADMIN_NICKNAME,
      displayName: FALLBACK_ADMIN_NICKNAME,
      email: '',
      phone: '',
      status: 'active',
      statusLabel: '启用中',
      roles: fallbackRole
        ? [{ id: '1', code: fallbackRole.code, name: fallbackRole.name }]
        : [],
      roleIds: ['1'],
      permissions: fallbackRole?.permissionKeys ?? [],
      lastLoginAt: undefined,
      lastLoginAtLabel: '--',
      createdAt: now.toISOString(),
      createdAtLabel: formatDateTime(now),
      updatedAt: now.toISOString(),
      updatedAtLabel: formatDateTime(now),
    };
  }

  private filterFallbackUsers(
    users: Array<ReturnType<IamService['buildFallbackManagedUserRecord']>>,
    query: AdminUserListQuery,
  ) {
    const search = query.search?.trim().toLowerCase();

    return users.filter((item) => {
      if (query.status && mapAdminUserStatus(query.status) !== item.status) {
        return false;
      }

      if (!search) {
        return true;
      }

      return [item.username, item.nickname, item.displayName]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(search));
    });
  }

  private async recordActionLog(
    client: Prisma.TransactionClient | PrismaService,
    input: {
      actor: AdminSessionUser | undefined;
      action: string;
      targetType: string;
      targetId?: string;
      targetLabel?: string;
      summary: string;
      detail?: Record<string, unknown>;
      context: AdminRequestContext;
    },
  ) {
    await client.adminActionLog.create({
      data: {
        actorUserId: parseSessionUserId(input.actor),
        actorUsername: input.actor?.username ?? 'unknown',
        actorDisplayName: input.actor?.displayName ?? input.actor?.username ?? 'unknown',
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        targetLabel: input.targetLabel,
        summary: input.summary,
        detail: sanitizeLogDetail(input.detail),
        ipAddress: normalizeOptionalText(input.context.ipAddress),
        userAgent: normalizeOptionalText(input.context.userAgent),
      },
    });
  }

  private resolveActionLabel(action: string) {
    switch (action) {
      case 'admin_user_created':
        return '创建管理员';
      case 'admin_user_updated':
        return '更新管理员';
      case 'admin_user_enabled':
        return '启用管理员';
      case 'admin_user_disabled':
        return '停用管理员';
      case 'admin_user_password_reset':
        return '重置密码';
      case 'admin_user_deleted':
        return '删除管理员';
      default:
        return action;
    }
  }

  private assertDatabaseWritable() {
    if (!this.prisma.isConfigured) {
      throw new ServiceUnavailableException('当前环境未配置数据库，无法执行写入操作。');
    }
  }
}

function matchesPassword(input: string, storedHash: string) {
  const normalizedStored = storedHash.trim().toLowerCase();
  const normalizedHash = normalizedStored.startsWith('sha256:')
    ? normalizedStored.slice('sha256:'.length)
    : normalizedStored;
  const plainMatch = input === storedHash;
  const md5Match = createHash('md5').update(input).digest('hex') === normalizedStored;
  const sha256Digest = createHash('sha256').update(input).digest('hex');
  const sha256Match =
    sha256Digest === normalizedStored || sha256Digest === normalizedHash;

  return plainMatch || md5Match || sha256Match;
}

function hashPassword(input: string) {
  return createHash('sha256').update(input.trim()).digest('hex');
}

function signToken(payload: AdminTokenPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString(
    'base64url',
  );

  return `${encodedPayload}.${createSignature(encodedPayload)}`;
}

function createSignature(encodedPayload: string) {
  return createHmac('sha256', ADMIN_AUTH_SECRET)
    .update(encodedPayload)
    .digest('base64url');
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function parseSessionUserId(session: AdminSessionUser | undefined) {
  if (!session?.id) {
    return undefined;
  }

  const parsed = Number(session.id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function formatDateTime(value: Date | null | undefined) {
  if (!value) {
    return '--';
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hour = String(value.getHours()).padStart(2, '0');
  const minute = String(value.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function mapAdminUserStatus(status: AdminUserStatus) {
  return status === AdminUserStatus.ACTIVE ? 'active' : 'disabled';
}

function mapRecordStatus(status: RecordStatus) {
  if (status === RecordStatus.INACTIVE) {
    return 'inactive';
  }

  if (status === RecordStatus.ARCHIVED) {
    return 'archived';
  }

  return 'active';
}

function uniqueStrings(items: string[]) {
  return [...new Set(items)];
}

function sanitizeLogDetail(detail: Record<string, unknown> | undefined) {
  if (!detail) {
    return undefined;
  }

  const entries = Object.entries(detail).filter((entry) => entry[1] !== undefined);
  return Object.fromEntries(entries) as Prisma.JsonObject;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function buildDeletedUsername(username: string, id: number) {
  const suffix = `deleted_${id}_${Date.now().toString(36)}`;
  const maxUsernameLength = 64;
  const remaining = maxUsernameLength - suffix.length - 2;
  const base = username.slice(0, Math.max(remaining, 0));

  return `${base}__${suffix}`;
}

export type { AdminPermissionGroup };
