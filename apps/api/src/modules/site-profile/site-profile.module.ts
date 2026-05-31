import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { SiteProfileController } from './site-profile.controller';
import { SiteProfileService } from './site-profile.service';

/**
 * Site profile domain boundary:
 * - site_profile
 */
@Module({
  imports: [PrismaModule],
  controllers: [SiteProfileController],
  providers: [SiteProfileService],
})
export class SiteProfileModule {}
