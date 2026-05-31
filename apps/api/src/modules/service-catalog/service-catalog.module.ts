import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { ServiceCatalogController } from './service-catalog.controller';
import { ServiceCatalogService } from './service-catalog.service';

/**
 * Service catalog domain boundary:
 * - service_categories
 * - service_projects
 * - service_items
 */
@Module({
  imports: [PrismaModule],
  controllers: [ServiceCatalogController],
  providers: [ServiceCatalogService],
})
export class ServiceCatalogModule {}
