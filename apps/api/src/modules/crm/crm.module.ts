import { Module } from '@nestjs/common';

import { CustomersController } from './customers.controller';
import { CrmService } from './crm.service';
import { InvoiceProfilesController } from './invoice-profiles.controller';

/**
 * CRM domain boundary:
 * - customers
 * - invoice_profiles
 */
@Module({
  controllers: [CustomersController, InvoiceProfilesController],
  providers: [CrmService],
})
export class CrmModule {}
