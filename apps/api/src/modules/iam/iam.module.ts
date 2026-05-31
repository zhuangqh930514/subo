import { Global, Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { AdminIamController } from './admin-iam.controller';
import { IamController } from './iam.controller';
import { IamService } from './iam.service';
import { AdminAuthGuard } from './session.guard';

/**
 * IAM domain boundary:
 * - admin_users
 * - roles / permissions / audit_logs can be added here later
 */
@Global()
@Module({
  imports: [PrismaModule],
  controllers: [IamController, AdminIamController],
  providers: [IamService, AdminAuthGuard],
  exports: [IamService, AdminAuthGuard],
})
export class IamModule {}
