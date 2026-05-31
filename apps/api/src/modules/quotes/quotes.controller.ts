import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { OrderType, QuoteRequestStatus } from '@prisma/client';

import { AdminSession } from '../iam/session.decorator';
import type { AdminSessionUser } from '../iam/iam.service';
import { CreateContactRequestDto } from './dto/create-contact-request.dto';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';
import {
  AssignQuoteRequestOwnerDto,
  CreateOrderFromQuoteDto,
  UpdateQuoteRequestStatusDto,
} from './dto/update-quote-request.dto';
import { QuotesService } from './quotes.service';
import { AdminAuthGuard } from '../iam/session.guard';

@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get('requests')
  @AdminAuthGuard.Protect()
  list(@Query('limit') limit?: string) {
    return this.quotesService.listRequests(parseLimit(limit, 50));
  }

  @Get('dashboard')
  @AdminAuthGuard.Protect()
  dashboard(@Query('limit') limit?: string) {
    return this.quotesService.getDashboardSummary(parseLimit(limit, 6));
  }

  @Patch('requests/:id/status')
  @AdminAuthGuard.Protect()
  updateStatus(
    @Param('id') id: string,
    @Body() payload: UpdateQuoteRequestStatusDto,
    @AdminSession() session: AdminSessionUser,
  ) {
    return this.quotesService.updateRequestStatus(
      parsePositiveInt(id, 'id'),
      parseQuoteRequestStatus(payload.status),
      parseSessionUserId(session),
    );
  }

  @Patch('requests/:id/owner')
  @AdminAuthGuard.Protect()
  assignOwner(
    @Param('id') id: string,
    @Body() payload: AssignQuoteRequestOwnerDto,
    @AdminSession() session: AdminSessionUser,
  ) {
    return this.quotesService.assignRequestOwner(
      parsePositiveInt(id, 'id'),
      parseOptionalPositiveInt(payload.ownerUserId, 'ownerUserId'),
      parseSessionUserId(session),
    );
  }

  @Delete('requests/:id')
  @AdminAuthGuard.Protect()
  remove(
    @Param('id') id: string,
    @AdminSession() session: AdminSessionUser,
  ) {
    return this.quotesService.deleteRequest(
      parsePositiveInt(id, 'id'),
      parseSessionUserId(session),
    );
  }

  @Post('requests/:id/orders')
  @AdminAuthGuard.Protect()
  createOrder(
    @Param('id') id: string,
    @Body() payload: CreateOrderFromQuoteDto,
    @AdminSession() session: AdminSessionUser,
  ) {
    return this.quotesService.createOrderFromRequest(
      parsePositiveInt(id, 'id'),
      {
        customerId: parsePositiveInt(String(payload.customerId), 'customerId'),
        orderType: parseOrderType(payload.orderType),
        projectName: payload.projectName,
        projectContent: payload.projectContent,
        amount: parseAmount(payload.amount),
        isPaid: payload.isPaid,
        hasContract: payload.hasContract,
        hasDeliveryNote: payload.hasDeliveryNote,
        orderDate: parseOptionalDate(payload.orderDate, 'orderDate'),
        remark: payload.remark,
        invoiceProfileId: parseOptionalPositiveInt(
          payload.invoiceProfileId,
          'invoiceProfileId',
        ),
        operatorUserId: parseSessionUserId(session),
      },
    );
  }

  @Post('requests')
  create(@Body() payload: CreateQuoteRequestDto) {
    return this.quotesService.createPublicRequest(payload);
  }

  @Post('contact')
  createContact(@Body() payload: CreateContactRequestDto) {
    return this.quotesService.createContactRequest(payload);
  }
}

function parseLimit(input: string | undefined, fallback: number) {
  const parsed = Number(input);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(Math.floor(parsed), 100);
}

function parsePositiveInt(value: string, fieldName: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException(`${fieldName} 必须是正整数。`);
  }

  return parsed;
}

function parseOptionalPositiveInt(
  value: number | string | null | undefined,
  fieldName: string,
) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return parsePositiveInt(String(value), fieldName);
}

function parseQuoteRequestStatus(value: string | undefined) {
  if (value === 'processing') {
    return QuoteRequestStatus.PROCESSING;
  }

  if (value === 'converted') {
    return QuoteRequestStatus.CONVERTED;
  }

  if (value === 'closed') {
    return QuoteRequestStatus.CLOSED;
  }

  if (value === 'pending') {
    return QuoteRequestStatus.PENDING;
  }

  throw new BadRequestException(
    'status 仅支持 pending / processing / converted / closed。',
  );
}

function parseOrderType(value: string | undefined) {
  if (value === 'procurement') {
    return OrderType.PROCUREMENT;
  }

  if (value === 'service') {
    return OrderType.SERVICE;
  }

  throw new BadRequestException('orderType 仅支持 service 或 procurement。');
}

function parseAmount(value: number | string | undefined) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new BadRequestException('amount 必须是大于等于 0 的数字。');
  }

  return parsed;
}

function parseOptionalDate(value: string | undefined, fieldName: string) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(`${value}T00:00:00+08:00`);

  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${fieldName} 必须是 YYYY-MM-DD 格式。`);
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
