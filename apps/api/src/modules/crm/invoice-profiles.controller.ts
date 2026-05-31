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

import { AdminSession } from '../iam/session.decorator';
import { AdminAuthGuard } from '../iam/session.guard';
import { CrmService, type SaveInvoiceProfilePayload } from './crm.service';

@Controller('admin/invoice-profiles')
@AdminAuthGuard.Protect()
export class InvoiceProfilesController {
  constructor(private readonly crmService: CrmService) {}

  @Get()
  list(
    @Query('search') search?: string,
    @Query('customerId') customerId?: string,
    @Query('defaultOnly') defaultOnly?: string,
    @Query('hasOrders') hasOrders?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.crmService.listInvoiceProfiles({
      search,
      customerId: customerId
        ? parsePositiveInt(customerId, 'customerId')
        : undefined,
      defaultOnly: parseBooleanQuery(defaultOnly, 'defaultOnly'),
      hasOrders: parseBooleanQuery(hasOrders, 'hasOrders'),
      page: parsePage(page),
      pageSize: parsePageSize(pageSize),
    });
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.crmService.getInvoiceProfileDetail(parsePositiveInt(id, 'id'));
  }

  @Post()
  create(
    @Body() payload: Record<string, unknown>,
    @AdminSession() session: SessionLike | undefined,
  ) {
    return this.crmService.createInvoiceProfile(
      parseInvoiceProfilePayload(payload),
      parseSessionUserId(session),
    );
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() payload: Record<string, unknown>,
    @AdminSession() session: SessionLike | undefined,
  ) {
    return this.crmService.updateInvoiceProfile(
      parsePositiveInt(id, 'id'),
      parseInvoiceProfilePayload(payload),
      parseSessionUserId(session),
    );
  }

  @Post(':id/default')
  setDefault(
    @Param('id') id: string,
    @AdminSession() session: SessionLike | undefined,
  ) {
    return this.crmService.setDefaultInvoiceProfile(
      parsePositiveInt(id, 'id'),
      parseSessionUserId(session),
    );
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

function parseInvoiceProfilePayload(
  input: Record<string, unknown>,
): SaveInvoiceProfilePayload {
  return {
    customerId: parseBodyPositiveInt(input.customerId, 'customerId'),
    companyName: parseRequiredText(input.companyName, 'companyName'),
    taxNumber: parseRequiredText(input.taxNumber, 'taxNumber'),
    address: parseOptionalText(input.address),
    phone: parseOptionalText(input.phone),
    bankName: parseOptionalText(input.bankName),
    bankAccount: parseOptionalText(input.bankAccount),
    isDefault: parseBooleanBody(input.isDefault, 'isDefault'),
  };
}

function parseBodyPositiveInt(value: unknown, fieldName: string) {
  const parsed =
    typeof value === 'string' && value.trim() ? Number(value) : Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException(`${fieldName} 必须是正整数。`);
  }

  return parsed;
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

function parseBooleanBody(value: unknown, fieldName: string) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'true' || normalized === '1') {
      return true;
    }

    if (normalized === 'false' || normalized === '0') {
      return false;
    }
  }

  throw new BadRequestException(`${fieldName} 仅支持布尔值。`);
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
