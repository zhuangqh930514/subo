import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OrderType } from '@prisma/client';

import { AdminSession } from '../iam/session.decorator';
import { AdminAuthGuard } from '../iam/session.guard';
import type { AdminSessionUser } from '../iam/iam.service';
import { OrdersService } from './orders.service';

@Controller('admin/orders')
@AdminAuthGuard.Protect()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('overview')
  overview(@Query('limit') limit?: string) {
    return this.ordersService.getOverview(parseLimit(limit, 6));
  }

  @Get()
  list(
    @Query('search') search?: string,
    @Query('orderType') orderType?: string,
    @Query('customerId') customerId?: string,
    @Query('isPaid') isPaid?: string,
    @Query('hasContract') hasContract?: string,
    @Query('hasDeliveryNote') hasDeliveryNote?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.ordersService.listOrders({
      search,
      orderType: parseOrderType(orderType),
      customerId: customerId
        ? parsePositiveInt(customerId, 'customerId')
        : undefined,
      isPaid: parseBooleanQuery(isPaid, 'isPaid'),
      hasContract: parseBooleanQuery(hasContract, 'hasContract'),
      hasDeliveryNote: parseBooleanQuery(hasDeliveryNote, 'hasDeliveryNote'),
      dateFrom: parseDateQuery(dateFrom, 'dateFrom'),
      dateTo: parseDateQuery(dateTo, 'dateTo'),
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.ordersService.getOrderDetail(parsePositiveInt(id, 'id'));
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() payload: Record<string, unknown>,
    @AdminSession() session: AdminSessionUser,
  ) {
    return this.ordersService.updateOrder(
      parsePositiveInt(id, 'id'),
      {
        projectName: parseRequiredText(payload.projectName, 'projectName'),
        projectContent: parseOptionalText(payload.projectContent),
        amount: parseAmount(payload.amount),
        isPaid: parseRequiredBoolean(payload.isPaid, 'isPaid'),
        hasContract: parseRequiredBoolean(payload.hasContract, 'hasContract'),
        hasDeliveryNote: parseRequiredBoolean(
          payload.hasDeliveryNote,
          'hasDeliveryNote',
        ),
        orderDate: parseOptionalDate(payload.orderDate, 'orderDate'),
        remark: parseOptionalText(payload.remark),
        operatorUserId: parseSessionUserId(session),
      },
    );
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @AdminSession() session: AdminSessionUser,
  ) {
    return this.ordersService.deleteOrder(
      parsePositiveInt(id, 'id'),
      parseSessionUserId(session),
    );
  }

  @Post(':id/contracts')
  @UseInterceptors(FileInterceptor('file'))
  createContract(
    @Param('id') id: string,
    @Body('contractName') contractName: string | undefined,
    @Body('description') description: string | undefined,
    @UploadedFile()
    file:
      | {
          originalname: string;
          mimetype?: string;
          size: number;
          buffer: Buffer;
        }
      | undefined,
    @AdminSession() session: AdminSessionUser,
  ) {
    return this.ordersService.createOrderContract(
      parsePositiveInt(id, 'id'),
      {
        contractName,
        description,
        uploadedByUserId: parseSessionUserId(session),
      },
      file,
    );
  }
}

function parseOrderType(value?: string) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === 'service') {
    return OrderType.SERVICE;
  }

  if (normalized === 'procurement') {
    return OrderType.PROCUREMENT;
  }

  throw new BadRequestException('orderType 仅支持 service 或 procurement。');
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

function parseDateQuery(value: string | undefined, fieldName: string) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(`${value}T00:00:00+08:00`);

  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${fieldName} 必须是 YYYY-MM-DD 格式。`);
  }

  if (fieldName === 'dateTo') {
    parsed.setHours(23, 59, 59, 999);
  }

  return parsed;
}

function parseOptionalDate(value: unknown, fieldName: string) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException(`${fieldName} 必须是 YYYY-MM-DD 格式。`);
  }

  const parsed = new Date(`${value}T00:00:00+08:00`);

  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${fieldName} 必须是 YYYY-MM-DD 格式。`);
  }

  return parsed;
}

function parsePositiveInt(value: string, fieldName: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException(`${fieldName} 必须是正整数。`);
  }

  return parsed;
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

function parseRequiredText(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new BadRequestException(`${fieldName} 不能为空。`);
  }

  return value.trim();
}

function parseOptionalText(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('文本字段必须是字符串。');
  }

  const normalized = value.trim();
  return normalized || undefined;
}

function parseRequiredBoolean(value: unknown, fieldName: string) {
  if (typeof value !== 'boolean') {
    throw new BadRequestException(`${fieldName} 必须是布尔值。`);
  }

  return value;
}

function parseAmount(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new BadRequestException('amount 必须是大于等于 0 的数字。');
  }

  return parsed;
}

function parseSessionUserId(session: AdminSessionUser | undefined) {
  if (!session?.id) {
    return undefined;
  }

  const parsed = Number(session.id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
