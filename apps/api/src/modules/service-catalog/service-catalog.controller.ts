import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';

import {
  BulkUpdateAdminServiceCatalogStatusPayload,
  ReimportServiceCatalogPayload,
  ServiceCatalogService,
  UpdateAdminServiceCatalogItemPayload,
} from './service-catalog.service';
import { AdminAuthGuard } from '../iam/session.guard';

@Controller('service-catalog')
export class ServiceCatalogController {
  constructor(private readonly serviceCatalogService: ServiceCatalogService) {}

  @Get('catalog')
  catalog() {
    return this.serviceCatalogService.getPublicCatalog();
  }

  @Get('admin/overview')
  @AdminAuthGuard.Protect()
  adminOverview(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.serviceCatalogService.getAdminOverview({
      search,
      categoryId: parseUnsignedInt(categoryId),
      projectId: parseUnsignedInt(projectId),
      status,
      limit: parseLimit(limit, 120),
    });
  }

  @Put('admin/items/:id')
  @AdminAuthGuard.Protect()
  updateAdminItem(
    @Param('id') id: string,
    @Body() payload: UpdateAdminServiceCatalogItemPayload,
  ) {
    return this.serviceCatalogService.updateAdminItem(parseRequiredUnsignedInt(id), payload);
  }

  @Post('admin/items/bulk-status')
  @AdminAuthGuard.Protect()
  bulkUpdateAdminItemsStatus(
    @Body() payload: BulkUpdateAdminServiceCatalogStatusPayload,
  ) {
    return this.serviceCatalogService.bulkUpdateAdminItemsStatus(payload);
  }

  @Post('admin/reimport')
  @AdminAuthGuard.Protect()
  reimportAdminCatalog(
    @Body() payload?: ReimportServiceCatalogPayload,
  ) {
    return this.serviceCatalogService.reimportAdminCatalog(payload);
  }
}

function parseLimit(input: string | undefined, fallback: number) {
  const parsed = Number(input);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(Math.floor(parsed), 300);
}

function parseUnsignedInt(input: string | undefined) {
  if (!input) {
    return undefined;
  }

  const parsed = Number(input);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

function parseRequiredUnsignedInt(input: string) {
  const parsed = Number(input);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 0;
  }

  return parsed;
}
