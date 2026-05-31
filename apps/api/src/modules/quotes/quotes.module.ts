import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';

/**
 * Quote domain boundary:
 * - quote_requests
 * - quote_request_items
 */
@Module({
  imports: [PrismaModule],
  controllers: [QuotesController],
  providers: [QuotesService],
})
export class QuotesModule {}
