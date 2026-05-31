import { Module } from '@nestjs/common';

import { ContractsController } from './contracts.controller';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

/**
 * Order domain boundary:
 * - orders
 * - contracts / attachments can be added here later
 */
@Module({
  controllers: [OrdersController, ContractsController],
  providers: [OrdersService],
})
export class OrdersModule {}
