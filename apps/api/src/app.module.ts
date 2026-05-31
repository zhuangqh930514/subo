import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CrmModule } from './modules/crm/crm.module';
import { HealthModule } from './modules/health/health.module';
import { IamModule } from './modules/iam/iam.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { ServiceCatalogModule } from './modules/service-catalog/service-catalog.module';
import { SiteProfileModule } from './modules/site-profile/site-profile.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    SiteProfileModule,
    ServiceCatalogModule,
    QuotesModule,
    CrmModule,
    OrdersModule,
    ProcurementModule,
    IamModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
