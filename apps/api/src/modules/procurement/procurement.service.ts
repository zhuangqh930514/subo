import { constants as fsConstants } from 'node:fs';
import { access, mkdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import * as XLSX from 'xlsx';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  Prisma,
  ProcurementListStatus,
  RecordStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export type ProcurementLinkStatusKey = 'active' | 'inactive' | 'archived';

export interface ProcurementPlatformOption {
  id: string;
  code: string;
  label: string;
}

export interface ProcurementInquiryOption {
  value: string;
  label: string;
}

export interface ProcurementCatalogItem {
  id: string;
  platformId: string;
  platformCode: string;
  platform: string;
  name: string;
  code: string;
  type: string;
  spec: string;
  unit: string;
  price: number;
  purchaseUrl: string;
  imageUrl: string;
  status: ProcurementLinkStatusKey;
  statusLabel: string;
  linkedInquiry: string;
  updatedAt: string;
}

export interface ProcurementHistoryRecord {
  id: string;
  listNo: string;
  platformCode: string;
  platform: string;
  relatedInquiry: string;
  relatedOrder: string;
  status: 'draft' | 'generated' | 'exported' | 'closed';
  statusLabel: string;
  itemCount: number;
  totalAmount: number;
  totalAmountLabel: string;
  downloadUrl?: string;
  updatedAt: string;
}

export interface ProcurementDetailItemRecord {
  id: string;
  supplierLinkId?: string;
  productName: string;
  productCode: string;
  productType: string;
  saleUnit: string;
  specification: string;
  unitPrice: number;
  unitPriceLabel: string;
  quantity: number;
  subtotal: number;
  subtotalLabel: string;
  purchaseUrl: string;
  remark: string;
}

export interface ProcurementDetailRecord {
  id: string;
  listNo: string;
  title: string;
  platformCode: string;
  platform: string;
  relatedInquiry: string;
  relatedOrder: string;
  status: 'draft' | 'generated' | 'exported' | 'closed';
  statusLabel: string;
  itemCount: number;
  totalAmount: number;
  totalAmountLabel: string;
  remark: string;
  downloadUrl?: string;
  updatedAt: string;
  items: ProcurementDetailItemRecord[];
}

export interface ProcurementDetailResponse {
  demoMode: boolean;
  record: ProcurementDetailRecord;
}

export interface ProcurementDetailMutationResponse {
  demoMode: boolean;
  message: string;
  record: ProcurementDetailRecord;
}

export interface ProcurementOverviewResponse {
  demoMode: boolean;
  platformOptions: ProcurementPlatformOption[];
  inquiryOptions: ProcurementInquiryOption[];
  statusOptions: Array<{ value: ProcurementLinkStatusKey; label: string }>;
  defaultSelectedIds: string[];
  exportFormats: string[];
  items: ProcurementCatalogItem[];
  records: ProcurementHistoryRecord[];
}

export interface ProcurementListActionPayload {
  supplierLinkIds?: Array<number | string>;
  linkedInquiry?: string;
  linkedInquiryLabel?: string;
  remark?: string;
  exportFormat?: string;
  operatorUserId?: number;
}

export interface SaveSupplierLinkPayload {
  platformId?: number;
  productName?: string;
  productCode?: string;
  productType?: string;
  saleUnit?: string;
  specification?: string;
  unitPrice?: number;
  purchaseUrl?: string;
  imageUrl?: string;
}

export interface UpdateSupplierLinkStatusPayload {
  status?: string;
}

export interface ProcurementMutationRecord {
  id: string;
  listNo: string;
  platform: string;
  status: 'draft' | 'generated' | 'exported' | 'closed';
  statusLabel: string;
  relatedInquiry: string;
  relatedOrder: string;
  itemCount: number;
  totalAmount: number;
  totalAmountLabel: string;
  downloadUrl?: string;
}

export interface ProcurementMutationResponse {
  demoMode: boolean;
  message: string;
  records: ProcurementMutationRecord[];
}

const EXPORT_DIR = join(
  __dirname,
  '..',
  '..',
  '..',
  '.cache',
  'procurement-exports',
);

const EXPORT_FORMATS = ['Excel'];
const DEFAULT_PLATFORMS = [
  { code: 'rjmart', name: '锐竟' },
  { code: 'casmart', name: '喀斯玛' },
  { code: 'other', name: '其他' },
] as const;

@Injectable()
export class ProcurementService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(limit: number): Promise<ProcurementOverviewResponse> {
    if (!this.prisma.isConfigured) {
      return buildDemoOverview(limit);
    }

    await this.ensureDefaultPlatforms();

    const [platforms, links, lists, quotes, orders] = await Promise.all([
      this.prisma.supplierPlatform.findMany({
        where: {
          deletedAt: null,
        },
        orderBy: [{ id: 'asc' }],
      }),
      this.prisma.supplierLink.findMany({
        where: {
          deletedAt: null,
        },
        take: Math.min(limit, 200),
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        include: {
          platform: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.procurementList.findMany({
        where: {
          deletedAt: null,
        },
        take: Math.min(limit, 50),
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        include: {
          platform: {
            select: {
              code: true,
              name: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNo: true,
              customer: {
                select: {
                  name: true,
                },
              },
            },
          },
          quoteRequest: {
            select: {
              id: true,
              quoteNo: true,
              companyName: true,
              customer: {
                select: {
                  name: true,
                },
              },
            },
          },
          customer: {
            select: {
              name: true,
            },
          },
          items: {
            select: {
              id: true,
              subtotal: true,
            },
          },
        },
      }),
      this.prisma.quoteRequest.findMany({
        where: {
          deletedAt: null,
        },
        take: 12,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          quoteNo: true,
          companyName: true,
          contactName: true,
          customer: {
            select: {
              name: true,
            },
          },
        },
      }),
      this.prisma.order.findMany({
        where: {
          deletedAt: null,
        },
        take: 12,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          orderNo: true,
          projectName: true,
          customer: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

    const usageMap = await this.loadSupplierLinkUsageMap(
      links.map((item) => item.id),
    );

    return {
      demoMode: false,
      platformOptions: platforms.map((item) => ({
        id: String(item.id),
        code: item.code,
        label: item.name,
      })),
      inquiryOptions: buildInquiryOptions(quotes, orders),
      statusOptions: [
        { value: 'active', label: '启用' },
        { value: 'inactive', label: '停用' },
        { value: 'archived', label: '归档' },
      ],
      defaultSelectedIds: links
        .filter((item) => item.status === RecordStatus.ACTIVE)
        .slice(0, 2)
        .map((item) => String(item.id)),
      exportFormats: [...EXPORT_FORMATS],
      items: links.map((item) => mapSupplierLinkRecord(item, usageMap.get(item.id))),
      records: lists.map((item) => mapProcurementHistoryRecord(item)),
    };
  }

  async createSupplierLink(payload: SaveSupplierLinkPayload, userId?: number) {
    if (!this.prisma.isConfigured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL 未配置，当前不能新增供应商链接。',
      );
    }

    await this.ensureDefaultPlatforms();

    const normalized = normalizeSupplierLinkPayload(payload);
    await this.ensurePlatformExists(normalized.platformId);

    const created = await this.prisma.supplierLink.create({
      data: {
        platformId: normalized.platformId,
        productName: normalized.productName,
        productCode: normalized.productCode ?? null,
        productType: normalized.productType ?? null,
        saleUnit: normalized.saleUnit ?? null,
        specification: normalized.specification ?? null,
        unitPrice: normalized.unitPrice,
        purchaseUrl: normalized.purchaseUrl,
        imageUrl: normalized.imageUrl ?? null,
        status: RecordStatus.ACTIVE,
        createdBy: userId ?? null,
        updatedBy: userId ?? null,
      },
      select: {
        id: true,
      },
    });

    return {
      message: '供应商链接已新增。',
      record: await this.getSupplierLinkRecord(created.id),
    };
  }

  async updateSupplierLink(
    id: number,
    payload: SaveSupplierLinkPayload,
    userId?: number,
  ) {
    if (!this.prisma.isConfigured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL 未配置，当前不能编辑供应商链接。',
      );
    }

    const existing = await this.prisma.supplierLink.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`未找到 ID=${id} 的供应商链接。`);
    }

    const normalized = normalizeSupplierLinkPayload(payload);
    await this.ensurePlatformExists(normalized.platformId);

    await this.prisma.supplierLink.update({
      where: {
        id,
      },
      data: {
        platformId: normalized.platformId,
        productName: normalized.productName,
        productCode: normalized.productCode ?? null,
        productType: normalized.productType ?? null,
        saleUnit: normalized.saleUnit ?? null,
        specification: normalized.specification ?? null,
        unitPrice: normalized.unitPrice,
        purchaseUrl: normalized.purchaseUrl,
        imageUrl: normalized.imageUrl ?? null,
        updatedBy: userId ?? null,
      },
    });

    return {
      message: '供应商链接已更新。',
      record: await this.getSupplierLinkRecord(id),
    };
  }

  async updateSupplierLinkStatus(
    id: number,
    payload: UpdateSupplierLinkStatusPayload,
    userId?: number,
  ) {
    if (!this.prisma.isConfigured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL 未配置，当前不能更新供应商链接状态。',
      );
    }

    const existing = await this.prisma.supplierLink.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`未找到 ID=${id} 的供应商链接。`);
    }

    await this.prisma.supplierLink.update({
      where: {
        id,
      },
      data: {
        status: parseSupplierLinkStatus(payload.status),
        updatedBy: userId ?? null,
      },
    });

    return {
      message: '供应商链接状态已更新。',
      record: await this.getSupplierLinkRecord(id),
    };
  }

  createDraftLists(payload: ProcurementListActionPayload) {
    return this.createLists(payload, ProcurementListStatus.DRAFT, false);
  }

  createGeneratedLists(payload: ProcurementListActionPayload) {
    return this.createLists(payload, ProcurementListStatus.GENERATED, false);
  }

  exportLists(payload: ProcurementListActionPayload) {
    return this.createLists(payload, ProcurementListStatus.GENERATED, true);
  }

  async getListDetail(listId: number): Promise<ProcurementDetailResponse> {
    if (!this.prisma.isConfigured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL 未配置，当前不能查看采购清单详情。',
      );
    }

    const list = await this.loadProcurementListDetailEntity(listId);

    if (!list) {
      throw new NotFoundException(`未找到 ID=${listId} 的采购清单。`);
    }

    return {
      demoMode: false,
      record: mapProcurementDetailRecord(list),
    };
  }

  async appendItemsToList(
    listId: number,
    payload: ProcurementListActionPayload,
  ): Promise<ProcurementMutationResponse> {
    if (!this.prisma.isConfigured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL 未配置，当前不能补充采购清单条目。',
      );
    }

    const supplierLinkIds = normalizeSupplierLinkIds(payload.supplierLinkIds);
    if (supplierLinkIds.length === 0) {
      throw new BadRequestException('请至少选择 1 条供应商链接。');
    }

    ensureSupportedExportFormat(payload.exportFormat);
    await this.ensureDefaultPlatforms();

    const existingList = await this.prisma.procurementList.findFirst({
      where: {
        id: listId,
        deletedAt: null,
      },
      include: {
        platform: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNo: true,
            customer: {
              select: {
                name: true,
              },
            },
          },
        },
        quoteRequest: {
          select: {
            id: true,
            quoteNo: true,
            companyName: true,
            customer: {
              select: {
                name: true,
              },
            },
          },
        },
        customer: {
          select: {
            name: true,
          },
        },
        items: {
          select: {
            supplierLinkId: true,
          },
        },
      },
    });

    if (!existingList) {
      throw new NotFoundException(`未找到 ID=${listId} 的采购清单。`);
    }

    const links = await this.prisma.supplierLink.findMany({
      where: {
        id: {
          in: supplierLinkIds,
        },
        deletedAt: null,
      },
      orderBy: [{ id: 'asc' }],
      include: {
        platform: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (links.length !== supplierLinkIds.length) {
      throw new BadRequestException('部分供应商链接不存在，无法补充到采购清单。');
    }

    const mismatchedLink = links.find(
      (item) => item.platformId !== existingList.platform.id,
    );
    if (mismatchedLink) {
      throw new BadRequestException(
        `目标清单属于${existingList.platform.name}，不能补入${mismatchedLink.platform.name}平台的链接。`,
      );
    }

    const existingSupplierLinkIds = new Set(
      existingList.items
        .map((item) => item.supplierLinkId)
        .filter((item): item is number => Number.isInteger(item)),
    );
    const nextLinks = links.filter((item) => !existingSupplierLinkIds.has(item.id));

    if (nextLinks.length === 0) {
      throw new BadRequestException('当前选中的供应商链接都已在这张采购清单中。');
    }

    const nextRemark = normalizeOptionalText(payload.remark);
    const shouldReExport = shouldReExportList(existingList);

    const updatedList = await this.prisma.$transaction(async (tx) => {
      await tx.procurementListItem.createMany({
        data: nextLinks.map((item) => ({
          procurementListId: existingList.id,
          supplierLinkId: item.id,
          productName: item.productName,
          productCode: item.productCode ?? null,
          productType: item.productType ?? null,
          saleUnit: item.saleUnit ?? null,
          specification: item.specification ?? null,
          unitPrice: item.unitPrice,
          quantity: new Prisma.Decimal(1),
          subtotal: item.unitPrice,
          purchaseUrl: item.purchaseUrl,
          remark: null,
          createdBy: payload.operatorUserId ?? null,
          updatedBy: payload.operatorUserId ?? null,
        })),
      });

      await tx.procurementList.update({
        where: {
          id: existingList.id,
        },
        data: {
          remark: appendRemark(existingList.remark, nextRemark) ?? null,
          updatedBy: payload.operatorUserId ?? null,
        },
      });

      return tx.procurementList.findFirstOrThrow({
        where: {
          id: existingList.id,
        },
        include: {
          platform: {
            select: {
              code: true,
              name: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNo: true,
              customer: {
                select: {
                  name: true,
                },
              },
            },
          },
          quoteRequest: {
            select: {
              id: true,
              quoteNo: true,
              companyName: true,
              customer: {
                select: {
                  name: true,
                },
              },
            },
          },
          customer: {
            select: {
              name: true,
            },
          },
          items: {
            orderBy: [{ id: 'asc' }],
            select: {
              id: true,
              supplierLinkId: true,
              productName: true,
              productCode: true,
              productType: true,
              saleUnit: true,
              specification: true,
              unitPrice: true,
              quantity: true,
              subtotal: true,
              purchaseUrl: true,
              remark: true,
            },
          },
        },
      });
    });

    let responseRecord: ProcurementHistoryRecord;
    if (shouldReExport) {
      const exportedList = await this.reExportProcurementList(
        updatedList,
        existingList.status,
        payload.operatorUserId,
      );
      responseRecord = mapProcurementHistoryRecord(exportedList);
    } else {
      responseRecord = mapProcurementHistoryRecord({
        ...updatedList,
        items: updatedList.items.map((item) => ({
          id: item.id,
          subtotal: item.subtotal,
        })),
      });
    }

    return {
      demoMode: false,
      message: shouldReExport
        ? '采购清单已补充商品并重新导出。'
        : '采购清单已补充商品。',
      records: [responseRecord],
    };
  }

  async deleteListItem(
    listId: number,
    itemId: number,
    operatorUserId?: number,
  ): Promise<ProcurementDetailMutationResponse> {
    if (!this.prisma.isConfigured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL 未配置，当前不能删除采购清单条目。',
      );
    }

    const existingList = await this.prisma.procurementList.findFirst({
      where: {
        id: listId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
        exportFileUrl: true,
      },
    });

    if (!existingList) {
      throw new NotFoundException(`未找到 ID=${listId} 的采购清单。`);
    }

    const existingItem = await this.prisma.procurementListItem.findFirst({
      where: {
        id: itemId,
        procurementListId: listId,
      },
      select: {
        id: true,
      },
    });

    if (!existingItem) {
      throw new NotFoundException(
        `未找到 ID=${itemId} 的采购清单条目，或它不属于当前清单。`,
      );
    }

    const updatedList = await this.prisma.$transaction(async (tx) => {
      await tx.procurementListItem.delete({
        where: {
          id: itemId,
        },
      });

      await tx.procurementList.update({
        where: {
          id: listId,
        },
        data: {
          updatedBy: operatorUserId ?? null,
        },
      });

      return tx.procurementList.findFirstOrThrow({
        where: {
          id: listId,
        },
        include: procurementListDetailInclude(),
      });
    });

    const finalList = shouldReExportList(existingList)
      ? await this.reExportProcurementList(
          updatedList,
          existingList.status,
          operatorUserId,
        )
      : updatedList;

    return {
      demoMode: false,
      message: shouldReExportList(existingList)
        ? '采购清单条目已删除，并已同步重导出。'
        : '采购清单条目已删除。',
      record: mapProcurementDetailRecord(finalList),
    };
  }

  async getExportFile(fileName: string) {
    const normalizedName = basename(fileName);
    if (!normalizedName || normalizedName !== fileName) {
      throw new BadRequestException('导出文件名无效。');
    }

    const filePath = join(EXPORT_DIR, normalizedName);
    await access(filePath, fsConstants.R_OK).catch(() => {
      throw new NotFoundException('未找到导出文件。');
    });

    return {
      fileName: normalizedName,
      filePath,
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  private async createLists(
    payload: ProcurementListActionPayload,
    baseStatus: ProcurementListStatus,
    shouldExport: boolean,
  ): Promise<ProcurementMutationResponse> {
    if (!this.prisma.isConfigured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL 未配置，当前不能生成采购清单。',
      );
    }

    const supplierLinkIds = normalizeSupplierLinkIds(payload.supplierLinkIds);
    if (supplierLinkIds.length === 0) {
      throw new BadRequestException('请至少选择 1 条供应商链接。');
    }

    await this.ensureDefaultPlatforms();

    const links = await this.prisma.supplierLink.findMany({
      where: {
        id: {
          in: supplierLinkIds,
        },
        deletedAt: null,
      },
      orderBy: [{ platformId: 'asc' }, { id: 'asc' }],
      include: {
        platform: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (links.length !== supplierLinkIds.length) {
      throw new BadRequestException('部分供应商链接不存在，无法生成采购清单。');
    }

    const linkedContext = await this.resolveLinkedContext(
      payload.linkedInquiry,
      payload.linkedInquiryLabel,
    );
    const remark = normalizeOptionalText(payload.remark);
    const created = await this.prisma.$transaction(async (tx) => {
      const grouped = groupSupplierLinksByPlatform(links);
      const results: Array<{
        id: number;
        listNo: string;
        platform: string;
        status: ProcurementListStatus;
        relatedInquiry: string;
        relatedOrder: string;
        itemCount: number;
        totalAmount: number;
        items: Array<{
          productName: string;
          productCode: string;
          productType: string;
          saleUnit: string;
          specification: string;
          unitPrice: number;
          quantity: number;
          subtotal: number;
          purchaseUrl: string;
        }>;
      }> = [];

      for (const [platformId, platformLinks] of grouped) {
        const listNo = buildProcurementListNo(platformId);
        const totalAmount = platformLinks.reduce(
          (sum, item) => sum + Number(item.unitPrice),
          0,
        );
        const itemRows = platformLinks.map((item) => ({
          supplierLinkId: item.id,
          productName: item.productName,
          productCode: item.productCode ?? null,
          productType: item.productType ?? null,
          saleUnit: item.saleUnit ?? null,
          specification: item.specification ?? null,
          unitPrice: item.unitPrice,
          quantity: new Prisma.Decimal(1),
          subtotal: item.unitPrice,
          purchaseUrl: item.purchaseUrl,
          remark: null,
        }));

        const createdList = await tx.procurementList.create({
          data: {
            listNo,
            platformId,
            orderId: linkedContext.orderId ?? null,
            quoteRequestId: linkedContext.quoteRequestId ?? null,
            customerId: linkedContext.customerId ?? null,
            title: buildProcurementListTitle(
              platformLinks[0]?.platform.name ?? '采购清单',
              linkedContext.label,
            ),
            remark: remark ?? null,
            status: baseStatus,
            exportFileUrl: null,
            createdBy: payload.operatorUserId ?? null,
            updatedBy: payload.operatorUserId ?? null,
            items: {
              create: itemRows,
            },
          },
          select: {
            id: true,
          },
        });

        results.push({
          id: createdList.id,
          listNo,
          platform: platformLinks[0]?.platform.name ?? '未知平台',
          status: baseStatus,
          relatedInquiry: linkedContext.label,
          relatedOrder: linkedContext.orderNo ?? '-',
          itemCount: itemRows.length,
          totalAmount,
          items: itemRows.map((item) => ({
            productName: item.productName,
            productCode: item.productCode ?? '',
            productType: item.productType ?? '',
            saleUnit: item.saleUnit ?? '',
            specification: item.specification ?? '',
            unitPrice: Number(item.unitPrice),
            quantity: 1,
            subtotal: Number(item.subtotal),
            purchaseUrl: item.purchaseUrl ?? '',
          })),
        });
      }

      return results;
    });

    const records: ProcurementMutationRecord[] = [];

    for (const item of created) {
      let downloadUrl: string | undefined;
      let finalStatus = item.status;

      if (shouldExport) {
        const exportFileName = await writeProcurementWorkbook(
          item.listNo,
          item.platform,
          item.relatedInquiry,
          remark ?? '',
          item.items,
        );

        await this.prisma.procurementList.update({
          where: {
            id: item.id,
          },
          data: {
            status: ProcurementListStatus.EXPORTED,
            exportFileUrl: exportFileName,
            updatedBy: payload.operatorUserId ?? null,
          },
        });

        finalStatus = ProcurementListStatus.EXPORTED;
        downloadUrl = `/procurement/exports/${encodeURIComponent(exportFileName)}`;
      }

      records.push({
        id: String(item.id),
        listNo: item.listNo,
        platform: item.platform,
        status: mapProcurementStatusKey(finalStatus),
        statusLabel: mapProcurementStatusLabel(finalStatus),
        relatedInquiry: item.relatedInquiry,
        relatedOrder: item.relatedOrder,
        itemCount: item.itemCount,
        totalAmount: item.totalAmount,
        totalAmountLabel: formatCurrency(item.totalAmount),
        downloadUrl,
      });
    }

    return {
      demoMode: false,
      message: shouldExport
        ? '采购清单已生成并导出。'
        : baseStatus === ProcurementListStatus.DRAFT
          ? '采购清单草稿已生成。'
          : '采购清单已生成。',
      records,
    };
  }

  private async getSupplierLinkRecord(id: number) {
    const link = await this.prisma.supplierLink.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        platform: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (!link) {
      throw new NotFoundException(`未找到 ID=${id} 的供应商链接。`);
    }

    const usageMap = await this.loadSupplierLinkUsageMap([id]);
    return mapSupplierLinkRecord(link, usageMap.get(id));
  }

  private async loadSupplierLinkUsageMap(ids: number[]) {
    if (ids.length === 0) {
      return new Map<number, string>();
    }

    const usages = await this.prisma.procurementListItem.findMany({
      where: {
        supplierLinkId: {
          in: ids,
        },
        procurementList: {
          deletedAt: null,
        },
      },
      orderBy: [{ id: 'desc' }],
      include: {
        procurementList: {
          include: {
            order: {
              select: {
                id: true,
                orderNo: true,
                customer: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            quoteRequest: {
              select: {
                id: true,
                quoteNo: true,
                companyName: true,
                customer: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            customer: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const usageMap = new Map<number, string>();
    for (const item of usages) {
      if (!item.supplierLinkId || usageMap.has(item.supplierLinkId)) {
        continue;
      }

      usageMap.set(
        item.supplierLinkId,
        buildLinkedInquiryLabel(item.procurementList) ?? '待关联新询价',
      );
    }

    return usageMap;
  }

  private async ensureDefaultPlatforms() {
    for (const item of DEFAULT_PLATFORMS) {
      await this.prisma.supplierPlatform.upsert({
        where: {
          code: item.code,
        },
        update: {
          name: item.name,
          status: RecordStatus.ACTIVE,
          deletedAt: null,
        },
        create: {
          code: item.code,
          name: item.name,
          status: RecordStatus.ACTIVE,
        },
      });
    }
  }

  private async ensurePlatformExists(id: number) {
    const platform = await this.prisma.supplierPlatform.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!platform) {
      throw new NotFoundException(`未找到 ID=${id} 的供应商平台。`);
    }
  }

  private async resolveLinkedContext(value?: string, label?: string) {
    const normalizedValue = normalizeOptionalText(value);
    const normalizedLabel = normalizeOptionalText(label);

    if (!normalizedValue) {
      return {
        orderId: null as number | null,
        orderNo: null as string | null,
        quoteRequestId: null as number | null,
        customerId: null as number | null,
        label: normalizedLabel ?? '待关联新询价',
      };
    }

    if (normalizedValue.startsWith('order:')) {
      const id = parseIdFromOption(normalizedValue, 'order');
      const order = await this.prisma.order.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        select: {
          id: true,
          orderNo: true,
          customerId: true,
          customer: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundException(`未找到 ID=${id} 的订单。`);
      }

      return {
        orderId: order.id,
        orderNo: order.orderNo,
        quoteRequestId: null,
        customerId: order.customerId,
        label:
          normalizedLabel ??
          `订单 | ${order.orderNo} | ${order.customer.name}`,
      };
    }

    if (normalizedValue.startsWith('quote:')) {
      const id = parseIdFromOption(normalizedValue, 'quote');
      const quote = await this.prisma.quoteRequest.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        select: {
          id: true,
          quoteNo: true,
          customerId: true,
          companyName: true,
          customer: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!quote) {
        throw new NotFoundException(`未找到 ID=${id} 的询价。`);
      }

      return {
        orderId: null,
        orderNo: null,
        quoteRequestId: quote.id,
        customerId: quote.customerId ?? null,
        label:
          normalizedLabel ??
          `询价 | ${quote.quoteNo} | ${
            quote.companyName ?? quote.customer?.name ?? '未命名客户'
          }`,
      };
    }

    return {
      orderId: null,
      orderNo: null,
      quoteRequestId: null,
      customerId: null,
      label: normalizedLabel ?? normalizedValue,
    };
  }

  private async loadProcurementListDetailEntity(listId: number) {
    return this.prisma.procurementList.findFirst({
      where: {
        id: listId,
        deletedAt: null,
      },
      include: procurementListDetailInclude(),
    });
  }

  private async reExportProcurementList(
    list: Awaited<
      ReturnType<ProcurementService['loadProcurementListDetailEntity']>
    > extends infer T
      ? NonNullable<T>
      : never,
    currentStatus: ProcurementListStatus,
    operatorUserId?: number,
  ) {
    const exportFileName = await writeProcurementWorkbook(
      list.listNo,
      list.platform.name,
      buildLinkedInquiryLabel(list) ?? '待关联新询价',
      list.remark ?? '',
      list.items.map((item) => ({
        productName: item.productName,
        productCode: item.productCode ?? '',
        productType: item.productType ?? '',
        saleUnit: item.saleUnit ?? '',
        specification: item.specification ?? '',
        unitPrice: Number(item.unitPrice),
        quantity: Number(item.quantity),
        subtotal: Number(item.subtotal),
        purchaseUrl: item.purchaseUrl ?? '',
      })),
    );

    return this.prisma.procurementList.update({
      where: {
        id: list.id,
      },
      data: {
        status: currentStatus,
        exportFileUrl: exportFileName,
        updatedBy: operatorUserId ?? null,
      },
      include: procurementListDetailInclude(),
    });
  }
}

function mapSupplierLinkRecord(
  item: {
    id: number;
    platformId: number;
    productName: string;
    productCode: string | null;
    productType: string | null;
    saleUnit: string | null;
    specification: string | null;
    unitPrice: Prisma.Decimal;
    purchaseUrl: string;
    imageUrl: string | null;
    status: RecordStatus;
    updatedAt: Date;
    platform: {
      id: number;
      code: string;
      name: string;
    };
  },
  linkedInquiry?: string,
): ProcurementCatalogItem {
  return {
    id: String(item.id),
    platformId: String(item.platformId),
    platformCode: item.platform.code,
    platform: item.platform.name,
    name: item.productName,
    code: item.productCode ?? '',
    type: item.productType ?? '',
    spec: item.specification ?? '',
    unit: item.saleUnit ?? '',
    price: Number(item.unitPrice),
    purchaseUrl: item.purchaseUrl,
    imageUrl: item.imageUrl ?? '',
    status: mapRecordStatusKey(item.status),
    statusLabel: mapRecordStatusLabel(item.status),
    linkedInquiry: linkedInquiry ?? '待关联新询价',
    updatedAt: formatDateTimeLabel(item.updatedAt),
  };
}

function mapProcurementHistoryRecord(item: {
  id: number;
  listNo: string;
  status: ProcurementListStatus;
  exportFileUrl: string | null;
  updatedAt: Date;
  platform: {
    code: string;
    name: string;
  };
  order: {
    id: number;
    orderNo: string;
    customer: {
      name: string;
    };
  } | null;
  quoteRequest: {
    id: number;
    quoteNo: string;
    companyName: string | null;
    customer: {
      name: string;
    } | null;
  } | null;
  customer: {
    name: string;
  } | null;
  items: Array<{
    id: number;
    subtotal: Prisma.Decimal;
  }>;
}): ProcurementHistoryRecord {
  const totalAmount = item.items.reduce(
    (sum, current) => sum + Number(current.subtotal),
    0,
  );
  const downloadUrl = item.exportFileUrl
    ? `/procurement/exports/${encodeURIComponent(item.exportFileUrl)}`
    : undefined;

  return {
    id: String(item.id),
    listNo: item.listNo,
    platformCode: item.platform.code,
    platform: item.platform.name,
    relatedInquiry: buildLinkedInquiryLabel(item) ?? '待关联新询价',
    relatedOrder: item.order?.orderNo ?? '-',
    status: mapProcurementStatusKey(item.status),
    statusLabel: mapProcurementStatusLabel(item.status),
    itemCount: item.items.length,
    totalAmount,
    totalAmountLabel: formatCurrency(totalAmount),
    downloadUrl,
    updatedAt: formatDateTimeLabel(item.updatedAt),
  };
}

function mapProcurementDetailRecord(item: {
  id: number;
  listNo: string;
  title: string;
  remark: string | null;
  status: ProcurementListStatus;
  exportFileUrl: string | null;
  updatedAt: Date;
  platform: {
    code: string;
    name: string;
  };
  order: {
    id: number;
    orderNo: string;
    customer: {
      name: string;
    };
  } | null;
  quoteRequest: {
    id: number;
    quoteNo: string;
    companyName: string | null;
    customer: {
      name: string;
    } | null;
  } | null;
  customer: {
    name: string;
  } | null;
  items: Array<{
    id: number;
    supplierLinkId: number | null;
    productName: string;
    productCode: string | null;
    productType: string | null;
    saleUnit: string | null;
    specification: string | null;
    unitPrice: Prisma.Decimal;
    quantity: Prisma.Decimal;
    subtotal: Prisma.Decimal;
    purchaseUrl: string | null;
    remark: string | null;
  }>;
}): ProcurementDetailRecord {
  const totalAmount = item.items.reduce(
    (sum, current) => sum + Number(current.subtotal),
    0,
  );
  const downloadUrl = item.exportFileUrl
    ? `/procurement/exports/${encodeURIComponent(item.exportFileUrl)}`
    : undefined;

  return {
    id: String(item.id),
    listNo: item.listNo,
    title: item.title,
    platformCode: item.platform.code,
    platform: item.platform.name,
    relatedInquiry: buildLinkedInquiryLabel(item) ?? '待关联新询价',
    relatedOrder: item.order?.orderNo ?? '-',
    status: mapProcurementStatusKey(item.status),
    statusLabel: mapProcurementStatusLabel(item.status),
    itemCount: item.items.length,
    totalAmount,
    totalAmountLabel: formatCurrency(totalAmount),
    remark: item.remark ?? '',
    downloadUrl,
    updatedAt: formatDateTimeLabel(item.updatedAt),
    items: item.items.map((detail) => ({
      id: String(detail.id),
      supplierLinkId: detail.supplierLinkId
        ? String(detail.supplierLinkId)
        : undefined,
      productName: detail.productName,
      productCode: detail.productCode ?? '',
      productType: detail.productType ?? '',
      saleUnit: detail.saleUnit ?? '',
      specification: detail.specification ?? '',
      unitPrice: Number(detail.unitPrice),
      unitPriceLabel: formatCurrency(detail.unitPrice),
      quantity: Number(detail.quantity),
      subtotal: Number(detail.subtotal),
      subtotalLabel: formatCurrency(detail.subtotal),
      purchaseUrl: detail.purchaseUrl ?? '',
      remark: detail.remark ?? '',
    })),
  };
}

function procurementListDetailInclude() {
  return {
    platform: {
      select: {
        code: true,
        name: true,
      },
    },
    order: {
      select: {
        id: true,
        orderNo: true,
        customer: {
          select: {
            name: true,
          },
        },
      },
    },
    quoteRequest: {
      select: {
        id: true,
        quoteNo: true,
        companyName: true,
        customer: {
          select: {
            name: true,
          },
        },
      },
    },
    customer: {
      select: {
        name: true,
      },
    },
    items: {
      orderBy: [{ id: 'asc' as const }],
      select: {
        id: true,
        supplierLinkId: true,
        productName: true,
        productCode: true,
        productType: true,
        saleUnit: true,
        specification: true,
        unitPrice: true,
        quantity: true,
        subtotal: true,
        purchaseUrl: true,
        remark: true,
      },
    },
  };
}

function buildInquiryOptions(
  quotes: Array<{
    id: number;
    quoteNo: string;
    companyName: string | null;
    contactName: string;
    customer: {
      name: string;
    } | null;
  }>,
  orders: Array<{
    id: number;
    orderNo: string;
    projectName: string;
    customer: {
      name: string;
    };
  }>,
): ProcurementInquiryOption[] {
  return [
    {
      value: 'manual:new',
      label: '待关联新询价',
    },
    ...quotes.map((item) => ({
      value: `quote:${item.id}`,
      label: `询价 | ${item.quoteNo} | ${
        item.companyName ?? item.customer?.name ?? item.contactName
      }`,
    })),
    ...orders.map((item) => ({
      value: `order:${item.id}`,
      label: `订单 | ${item.orderNo} | ${item.customer.name}`,
    })),
  ];
}

function groupSupplierLinksByPlatform(
  items: Array<{
    id: number;
    platformId: number;
    productName: string;
    productCode: string | null;
    productType: string | null;
    saleUnit: string | null;
    specification: string | null;
    unitPrice: Prisma.Decimal;
    purchaseUrl: string;
    platform: {
      name: string;
    };
  }>,
) {
  const grouped = new Map<number, typeof items>();

  for (const item of items) {
    const current = grouped.get(item.platformId) ?? [];
    current.push(item);
    grouped.set(item.platformId, current);
  }

  return grouped;
}

async function writeProcurementWorkbook(
  listNo: string,
  platform: string,
  relatedInquiry: string,
  remark: string,
  items: Array<{
    productName: string;
    productCode: string;
    productType: string;
    saleUnit: string;
    specification: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
    purchaseUrl: string;
  }>,
) {
  await mkdir(EXPORT_DIR, { recursive: true });

  const workbook = XLSX.utils.book_new();
  const rows = items.map((item, index) => ({
    序号: index + 1,
    产品名称: item.productName,
    货号: item.productCode,
    类型: item.productType,
    销售单位: item.saleUnit,
    规格: item.specification,
    单价: item.unitPrice,
    数量: item.quantity,
    小计: item.subtotal,
    采购链接: item.purchaseUrl,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.sheet_add_aoa(
    worksheet,
    [
      ['清单编号', listNo],
      ['平台', platform],
      ['关联对象', relatedInquiry],
      ['备注', remark || '-'],
      [],
    ],
    { origin: 'A1' },
  );
  XLSX.utils.book_append_sheet(workbook, worksheet, '采购清单');

  const fileName = `${listNo}.xlsx`;
  XLSX.writeFile(workbook, join(EXPORT_DIR, fileName));
  return fileName;
}

function normalizeSupplierLinkPayload(payload: SaveSupplierLinkPayload) {
  const platformId = Number(payload.platformId);
  const unitPrice = Number(payload.unitPrice);
  const purchaseUrl = normalizeOptionalText(payload.purchaseUrl);

  if (!Number.isInteger(platformId) || platformId <= 0) {
    throw new BadRequestException('platformId 必须是正整数。');
  }

  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    throw new BadRequestException('unitPrice 必须是大于等于 0 的数字。');
  }

  if (!purchaseUrl) {
    throw new BadRequestException('purchaseUrl 不能为空。');
  }

  return {
    platformId,
    productName: requireText(payload.productName, 'productName'),
    productCode: normalizeOptionalText(payload.productCode),
    productType: normalizeOptionalText(payload.productType),
    saleUnit: normalizeOptionalText(payload.saleUnit),
    specification: normalizeOptionalText(payload.specification),
    unitPrice,
    purchaseUrl,
    imageUrl: normalizeOptionalText(payload.imageUrl),
  };
}

function ensureSupportedExportFormat(value: string | undefined) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return;
  }

  if (!EXPORT_FORMATS.includes(normalized)) {
    throw new BadRequestException(
      `exportFormat 仅支持 ${EXPORT_FORMATS.join(' / ')}。`,
    );
  }
}

function normalizeSupplierLinkIds(value: Array<number | string> | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0),
    ),
  );
}

function parseSupplierLinkStatus(value: string | undefined) {
  if (value === 'inactive') {
    return RecordStatus.INACTIVE;
  }

  if (value === 'archived') {
    return RecordStatus.ARCHIVED;
  }

  if (value === 'active') {
    return RecordStatus.ACTIVE;
  }

  throw new BadRequestException('status 仅支持 active / inactive / archived。');
}

function parseIdFromOption(value: string, prefix: string) {
  const candidate = value.slice(prefix.length + 1);
  const parsed = Number(candidate);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException(`${prefix} 选项无效。`);
  }

  return parsed;
}

function requireText(value: string | undefined, fieldName: string) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    throw new BadRequestException(`${fieldName} 不能为空。`);
  }

  return normalized;
}

function normalizeOptionalText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function appendRemark(current?: string | null, incoming?: string) {
  const normalizedCurrent = normalizeOptionalText(current);
  const normalizedIncoming = normalizeOptionalText(incoming);

  if (!normalizedIncoming) {
    return normalizedCurrent;
  }

  if (!normalizedCurrent) {
    return normalizedIncoming;
  }

  if (normalizedCurrent.includes(normalizedIncoming)) {
    return normalizedCurrent;
  }

  return `${normalizedCurrent}\n${normalizedIncoming}`;
}

function mapRecordStatusKey(status: RecordStatus): ProcurementLinkStatusKey {
  if (status === RecordStatus.INACTIVE) {
    return 'inactive';
  }

  if (status === RecordStatus.ARCHIVED) {
    return 'archived';
  }

  return 'active';
}

function mapRecordStatusLabel(status: RecordStatus) {
  if (status === RecordStatus.INACTIVE) {
    return '停用';
  }

  if (status === RecordStatus.ARCHIVED) {
    return '归档';
  }

  return '启用';
}

function mapProcurementStatusKey(status: ProcurementListStatus) {
  if (status === ProcurementListStatus.GENERATED) {
    return 'generated' as const;
  }

  if (status === ProcurementListStatus.EXPORTED) {
    return 'exported' as const;
  }

  if (status === ProcurementListStatus.CLOSED) {
    return 'closed' as const;
  }

  return 'draft' as const;
}

function mapProcurementStatusLabel(status: ProcurementListStatus) {
  if (status === ProcurementListStatus.GENERATED) {
    return '已生成';
  }

  if (status === ProcurementListStatus.EXPORTED) {
    return '已导出';
  }

  if (status === ProcurementListStatus.CLOSED) {
    return '已关闭';
  }

  return '草稿';
}

function formatCurrency(value: number | Prisma.Decimal) {
  const amount = typeof value === 'number' ? value : Number(value);

  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDateTimeLabel(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function buildLinkedInquiryLabel(item: {
  order?: {
    orderNo: string;
    customer: {
      name: string;
    };
  } | null;
  quoteRequest?: {
    quoteNo: string;
    companyName: string | null;
    customer: {
      name: string;
    } | null;
  } | null;
  customer?: {
    name: string;
  } | null;
}) {
  if (item.order) {
    return `订单 | ${item.order.orderNo} | ${item.order.customer.name}`;
  }

  if (item.quoteRequest) {
    return `询价 | ${item.quoteRequest.quoteNo} | ${
      item.quoteRequest.companyName ?? item.quoteRequest.customer?.name ?? '未命名客户'
    }`;
  }

  if (item.customer?.name) {
    return `客户 | ${item.customer.name}`;
  }

  return undefined;
}

function buildProcurementListTitle(platformName: string, linkedInquiryLabel: string) {
  const suffix = linkedInquiryLabel.replace(/^询价 \| |^订单 \| /, '');
  return `${platformName}采购清单 - ${suffix}`.slice(0, 160);
}

function shouldReExportList(item: {
  status: ProcurementListStatus;
  exportFileUrl?: string | null;
}) {
  return (
    item.status === ProcurementListStatus.EXPORTED ||
    Boolean(item.exportFileUrl)
  );
}

function buildProcurementListNo(platformId: number) {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, '')
    .slice(0, 14);
  const suffix = String(platformId).padStart(2, '0');

  return `PL-${stamp}-${suffix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function buildDemoOverview(limit: number): ProcurementOverviewResponse {
  const items = ([
    {
      id: '100001',
      platformId: '1',
      platformCode: 'rjmart',
      platform: '锐竟',
      name: 'TSA Plus 荧光四标五色染色试剂盒',
      code: 'TSA-SBWS',
      type: '试剂盒',
      spec: '50T',
      unit: '盒',
      price: 4000,
      purchaseUrl: 'https://example.com/rj/tsa-sbws',
      imageUrl: '',
      status: 'active',
      statusLabel: '启用',
      linkedInquiry: '询价 | SB202605300955GA93 | 广东省人民医院',
      updatedAt: '05/30 10:10',
    },
    {
      id: '100002',
      platformId: '2',
      platformCode: 'casmart',
      platform: '喀斯玛',
      name: '胎牛血清（优级）',
      code: 'A5256701',
      type: '血清',
      spec: '500mL/瓶',
      unit: '瓶',
      price: 3000,
      purchaseUrl: 'https://example.com/cs/a5256701',
      imageUrl: '',
      status: 'active',
      statusLabel: '启用',
      linkedInquiry: '询价 | SB202605291620CS01 | 华南农业大学动物医学学院',
      updatedAt: '05/30 10:32',
    },
    {
      id: '100003',
      platformId: '1',
      platformCode: 'rjmart',
      platform: '锐竟',
      name: '乳酸脱氢酶细胞毒性检测试剂盒',
      code: 'RSTQMXBDXJCSJH',
      type: '试剂盒',
      spec: '500次',
      unit: '盒',
      price: 800,
      purchaseUrl: 'https://example.com/rj/rstq',
      imageUrl: '',
      status: 'inactive',
      statusLabel: '停用',
      linkedInquiry: '待关联新询价',
      updatedAt: '05/29 18:15',
    },
  ] satisfies ProcurementCatalogItem[]).slice(0, Math.max(1, limit));

  return {
    demoMode: true,
    platformOptions: [
      { id: '1', code: 'rjmart', label: '锐竟' },
      { id: '2', code: 'casmart', label: '喀斯玛' },
      { id: '3', code: 'other', label: '其他' },
    ],
    inquiryOptions: [
      { value: 'manual:new', label: '待关联新询价' },
      { value: 'quote:1', label: '询价 | SB202605300955GA93 | 广东省人民医院' },
      { value: 'quote:2', label: '询价 | SB202605291620CS01 | 华南农业大学动物医学学院' },
    ],
    statusOptions: [
      { value: 'active', label: '启用' },
      { value: 'inactive', label: '停用' },
      { value: 'archived', label: '归档' },
    ],
    defaultSelectedIds: items.slice(0, 2).map((item) => item.id),
    exportFormats: [...EXPORT_FORMATS],
    items,
    records: [
      {
        id: '1',
        listNo: 'PL-202605300001',
        platformCode: 'rjmart',
        platform: '锐竟',
        relatedInquiry: '询价 | SB202605300955GA93 | 广东省人民医院',
        relatedOrder: '-',
        status: 'exported',
        statusLabel: '已导出',
        itemCount: 2,
        totalAmount: 4800,
        totalAmountLabel: formatCurrency(4800),
        updatedAt: '05/30 10:40',
      },
    ],
  };
}
