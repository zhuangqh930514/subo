import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createPrismaAdapter } from './mariadb-adapter';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      adapter: createPrismaAdapter(),
    });
  }

  get isConfigured() {
    return Boolean(process.env.DATABASE_URL);
  }

  async onModuleInit() {
    if (!this.isConfigured) {
      return;
    }

    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async ping() {
    if (!this.isConfigured) {
      return false;
    }

    await this.$queryRaw`SELECT 1`;
    return true;
  }
}
