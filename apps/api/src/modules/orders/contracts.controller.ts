import { createReadStream } from 'node:fs';

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';

import { AdminSession } from '../iam/session.decorator';
import { AdminAuthGuard } from '../iam/session.guard';
import type { AdminSessionUser } from '../iam/iam.service';
import { OrdersService } from './orders.service';

@Controller('admin/contracts')
@AdminAuthGuard.Protect()
export class ContractsController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('overview')
  overview(@Query('limit') limit?: string) {
    return this.ordersService.getContractsOverview(parseLimit(limit, 6));
  }

  @Get()
  list(
    @Query('search') search?: string,
    @Query('hasOrder') hasOrder?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.ordersService.listContracts({
      search,
      hasOrder: parseBooleanQuery(hasOrder, 'hasOrder'),
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.ordersService.getContractDetail(parsePositiveInt(id, 'id'));
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body('orderId') orderId?: string | null,
    @Body('contractName') contractName?: string,
    @Body('description') description?: string,
    @AdminSession() session?: AdminSessionUser,
  ) {
    return this.ordersService.updateContract(parsePositiveInt(id, 'id'), {
      orderId: parseNullablePositiveInt(orderId, 'orderId'),
      contractName,
      description,
      updatedByUserId: parseSessionUserId(session),
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @AdminSession() session?: AdminSessionUser) {
    return this.ordersService.deleteContract(
      parsePositiveInt(id, 'id'),
      parseSessionUserId(session),
    );
  }

  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: {
      setHeader(name: string, value: string): void;
    },
  ) {
    const file = await this.ordersService.getContractDownloadFile(
      parsePositiveInt(id, 'id'),
    );

    response.setHeader('Content-Type', file.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.fileName)}"`,
    );

    return new StreamableFile(createReadStream(file.filePath));
  }
}

function parseBooleanQuery(value: string | undefined, fieldName: string) {
  if (value === undefined || value === '') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === 'true' || normalized === '1') {
    return true;
  }

  if (normalized === 'false' || normalized === '0') {
    return false;
  }

  throw new BadRequestException(`${fieldName} 仅支持 true/false/1/0。`);
}

function parsePositiveInt(value: string, fieldName: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException(`${fieldName} 必须是正整数。`);
  }

  return parsed;
}

function parseNullablePositiveInt(
  value: string | null | undefined,
  fieldName: string,
) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  return parsePositiveInt(value, fieldName);
}

function parsePage(value?: string) {
  if (!value) {
    return 1;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException('page 必须是大于 0 的整数。');
  }

  return parsed;
}

function parsePageSize(value?: string) {
  if (!value) {
    return 20;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException('pageSize 必须是大于 0 的整数。');
  }

  return Math.min(parsed, 100);
}

function parseLimit(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException('limit 必须是大于 0 的整数。');
  }

  return Math.min(parsed, 20);
}

function parseSessionUserId(session: AdminSessionUser | undefined) {
  if (!session?.id) {
    return undefined;
  }

  const parsed = Number(session.id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
