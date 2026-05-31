import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { ProcurementController } from './procurement.controller';
import { ProcurementService } from './procurement.service';

/**
 * Procurement domain boundary:
 * - supplier_platforms
 * - supplier_links
 * - procurement_lists
 * - procurement_list_items
 */
@Module({
  imports: [PrismaModule],
  controllers: [ProcurementController],
  providers: [ProcurementService],
})
export class ProcurementModule {}
