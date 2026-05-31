import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CustomerType } from '@prisma/client';

import { AdminSession } from '../iam/session.decorator';
import { AdminAuthGuard } from '../iam/session.guard';
import { CrmService, type SaveCustomerPayload } from './crm.service';

@Controller('admin/customers')
@AdminAuthGuard.Protect()
export class CustomersController {
  constructor(private readonly crmService: CrmService) {}

  @Get('overview')
  overview(@Query('limit') limit?: string) {
    return this.crmService.getOverview(parseLimit(limit, 6));
  }

  @Get()
  list(
    @Query('search') search?: string,
    @Query('customerType') customerType?: string,
    @Query('source') source?: string,
    @Query('hasOrders') hasOrders?: string,
    @Query('hasInvoiceProfiles') hasInvoiceProfiles?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.crmService.listCustomers({
      search,
      customerType: parseCustomerType(customerType),
      source,
      hasOrders: parseBooleanQuery(hasOrders, 'hasOrders'),
      hasInvoiceProfiles: parseBooleanQuery(
        hasInvoiceProfiles,
        'hasInvoiceProfiles',
      ),
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.crmService.getCustomerDetail(parsePositiveInt(id, 'id'));
  }

  @Post()
  create(
    @Body() payload: Record<string, unknown>,
    @AdminSession() session: SessionLike | undefined,
  ) {
    return this.crmService.createCustomer(
      parseCustomerPayload(payload),
      parseSessionUserId(session),
    );
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() payload: Record<string, unknown>,
    @AdminSession() session: SessionLike | undefined,
  ) {
    return this.crmService.updateCustomer(
      parsePositiveInt(id, 'id'),
      parseCustomerPayload(payload),
      parseSessionUserId(session),
    );
  }
}

function parseCustomerType(value?: string) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === 'company') {
    return CustomerType.COMPANY;
  }

  if (normalized === 'individual') {
    return CustomerType.INDIVIDUAL;
  }

  throw new BadRequestException('customerType 仅支持 company 或 individual。');
}

function parseCustomerPayload(input: Record<string, unknown>): SaveCustomerPayload {
  return {
    name: parseRequiredText(input.name, 'name'),
    customerType: parseEditableCustomerType(input.customerType),
    source: parseOptionalText(input.source),
    industry: parseOptionalText(input.industry),
    address: parseOptionalText(input.address),
    remark: parseOptionalText(input.remark),
  };
}

function parseEditableCustomerType(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('customerType 仅支持 company、individual 或 unknown。');
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === 'company') {
    return CustomerType.COMPANY;
  }

  if (normalized === 'individual') {
    return CustomerType.INDIVIDUAL;
  }

  if (normalized === 'unknown') {
    return null;
  }

  throw new BadRequestException('customerType 仅支持 company、individual 或 unknown。');
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

type SessionLike = {
  id?: number | string;
};

function parseSessionUserId(session: SessionLike | undefined) {
  if (!session?.id) {
    return undefined;
  }

  const parsed = Number(session.id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
