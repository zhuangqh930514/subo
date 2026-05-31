import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus() {
    const databaseUp = await this.prisma.ping();
    const database = this.prisma.isConfigured
      ? databaseUp
        ? 'up'
        : 'down'
      : 'not-configured';

    return {
      status: database === 'down' ? 'degraded' : 'ok',
      database,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
}
