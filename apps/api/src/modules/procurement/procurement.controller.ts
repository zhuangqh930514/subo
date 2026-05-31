import { createReadStream } from 'node:fs';

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';

import {
  ProcurementListActionPayload,
  ProcurementService,
  SaveSupplierLinkPayload,
  UpdateSupplierLinkStatusPayload,
} from './procurement.service';
import { AdminSession } from '../iam/session.decorator';
import type { AdminSessionUser } from '../iam/iam.service';
import { AdminAuthGuard } from '../iam/session.guard';

@Controller('procurement')
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  @Get('overview')
  @AdminAuthGuard.Protect()
  overview(@Query('limit') limit?: string) {
    return this.procurementService.getOverview(parseLimit(limit, 50));
  }

  @Get('lists/:id')
  @AdminAuthGuard.Protect()
  detail(@Param('id') id: string) {
    return this.procurementService.getListDetail(parsePositiveInt(id, 'id'));
  }

  @Post('links')
  @AdminAuthGuard.Protect()
  createLink(
    @Body() payload: SaveSupplierLinkPayload,
    @AdminSession() session: AdminSessionUser,
  ) {
    return this.procurementService.createSupplierLink(
      payload,
      parseSessionUserId(session),
    );
  }

  @Put('links/:id')
  @AdminAuthGuard.Protect()
  updateLink(
    @Param('id') id: string,
    @Body() payload: SaveSupplierLinkPayload,
    @AdminSession() session: AdminSessionUser,
  ) {
    return this.procurementService.updateSupplierLink(
      parsePositiveInt(id, 'id'),
      payload,
      parseSessionUserId(session),
    );
  }

  @Patch('links/:id/status')
  @AdminAuthGuard.Protect()
  updateLinkStatus(
    @Param('id') id: string,
    @Body() payload: UpdateSupplierLinkStatusPayload,
    @AdminSession() session: AdminSessionUser,
  ) {
    return this.procurementService.updateSupplierLinkStatus(
      parsePositiveInt(id, 'id'),
      payload,
      parseSessionUserId(session),
    );
  }

  @Post('lists/draft')
  @AdminAuthGuard.Protect()
  createDraft(
    @Body() payload: ProcurementListActionPayload,
    @AdminSession() session: AdminSessionUser,
  ) {
    return this.procurementService.createDraftLists({
      ...payload,
      operatorUserId: parseSessionUserId(session),
    });
  }

  @Post('lists/generate')
  @AdminAuthGuard.Protect()
  createGenerated(
    @Body() payload: ProcurementListActionPayload,
    @AdminSession() session: AdminSessionUser,
  ) {
    return this.procurementService.createGeneratedLists({
      ...payload,
      operatorUserId: parseSessionUserId(session),
    });
  }

  @Post('lists/export')
  @AdminAuthGuard.Protect()
  export(
    @Body() payload: ProcurementListActionPayload,
    @AdminSession() session: AdminSessionUser,
  ) {
    return this.procurementService.exportLists({
      ...payload,
      operatorUserId: parseSessionUserId(session),
    });
  }

  @Post('lists/:id/items')
  @AdminAuthGuard.Protect()
  appendItems(
    @Param('id') id: string,
    @Body() payload: ProcurementListActionPayload,
    @AdminSession() session: AdminSessionUser,
  ) {
    return this.procurementService.appendItemsToList(
      parsePositiveInt(id, 'id'),
      {
        ...payload,
        operatorUserId: parseSessionUserId(session),
      },
    );
  }

  @Delete('lists/:listId/items/:itemId')
  @AdminAuthGuard.Protect()
  deleteItem(
    @Param('listId') listId: string,
    @Param('itemId') itemId: string,
    @AdminSession() session: AdminSessionUser,
  ) {
    return this.procurementService.deleteListItem(
      parsePositiveInt(listId, 'listId'),
      parsePositiveInt(itemId, 'itemId'),
      parseSessionUserId(session),
    );
  }

  @Get('exports/:fileName')
  async downloadExport(
    @Param('fileName') fileName: string,
    @Res({ passthrough: true }) response: {
      setHeader(name: string, value: string): void;
    },
  ) {
    const file = await this.procurementService.getExportFile(fileName);

    response.setHeader('Content-Type', file.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.fileName)}"`,
    );

    return new StreamableFile(createReadStream(file.filePath));
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

function parseSessionUserId(session: AdminSessionUser | undefined) {
  if (!session?.id) {
    return undefined;
  }

  const parsed = Number(session.id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
