import { randomUUID } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import { access, mkdir, unlink, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  BusinessType,
  OrderType,
  Prisma,
  ProcurementListStatus,
  QuoteRequestStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface OrderListQuery {
  search?: string;
  orderType?: OrderType;
  customerId?: number;
  isPaid?: boolean;
  hasContract?: boolean;
  hasDeliveryNote?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  pageSize: number;
}

export interface ContractListQuery {
  search?: string;
  hasOrder?: boolean;
  page: number;
  pageSize: number;
}

export interface OrdersOverviewResponse {
  demoMode: boolean;
  summary: {
    totalOrders: number;
    serviceOrderCount: number;
    procurementOrderCount: number;
    paidOrderCount: number;
    pendingPaymentCount: number;
    paidOrderAmount: number;
    paidOrderAmountLabel: string;
    pendingPaymentAmount: number;
    pendingPaymentAmountLabel: string;
    totalOrderAmount: number;
    totalOrderAmountLabel: string;
  };
  recentOrders: OrderListRecord[];
}

export interface ContractsOverviewResponse {
  demoMode: boolean;
  summary: {
    totalContracts: number;
    linkedOrderContracts: number;
    unlinkedContracts: number;
    legacyContracts: number;
  };
  recentContracts: ContractListRecord[];
}

export interface OrderListRecord {
  id: string;
  orderNo: string;
  orderType: 'service' | 'procurement';
  orderTypeLabel: string;
  customer: {
    id: string;
    name: string;
  };
  projectName: string;
  projectContentPreview: string;
  amount: number;
  amountLabel: string;
  isPaid: boolean;
  paymentStatusLabel: string;
  hasContract: boolean;
  hasDeliveryNote: boolean;
  orderDate?: string;
  orderDateLabel: string;
  invoiceProfile:
    | {
        id: string;
        companyName: string;
        taxNumber: string;
        customerId: string;
      }
    | undefined;
  quoteRequest:
    | {
        id: string;
        quoteNo: string;
        businessType: 'service' | 'procurement' | 'mixed';
        businessTypeLabel: string;
        status: 'pending' | 'processing' | 'converted' | 'closed';
        statusLabel: string;
      }
    | undefined;
  owner: string;
  procurementListCount: number;
  procurementPlatforms: string[];
  integrityFlags: string[];
  updatedAt: string;
  updatedAtLabel: string;
}

export interface OrderDetailRecord {
  id: string;
  orderNo: string;
  orderType: 'service' | 'procurement';
  orderTypeLabel: string;
  projectName: string;
  projectContent: string;
  amount: number;
  amountLabel: string;
  isPaid: boolean;
  paymentStatusLabel: string;
  hasContract: boolean;
  hasDeliveryNote: boolean;
  orderDate?: string;
  orderDateLabel: string;
  remark: string;
  createdAt: string;
  createdAtLabel: string;
  updatedAt: string;
  updatedAtLabel: string;
  owner: string;
  customer: {
    id: string;
    name: string;
    source: string;
    customerType: 'company' | 'individual' | 'unknown';
    customerTypeLabel: string;
  };
  invoiceProfile:
    | {
        id: string;
        customerId: string;
        customerName: string;
        companyName: string;
        taxNumber: string;
        address: string;
        phone: string;
        bankName: string;
        bankAccount: string;
      }
    | undefined;
  quoteRequest:
    | {
        id: string;
        quoteNo: string;
        customerId?: string;
        companyName: string;
        contactName: string;
        businessType: 'service' | 'procurement' | 'mixed';
        businessTypeLabel: string;
        status: 'pending' | 'processing' | 'converted' | 'closed';
        statusLabel: string;
        estimatedTotalAmount: number;
        estimatedTotalAmountLabel: string;
        updatedAt: string;
        updatedAtLabel: string;
      }
    | undefined;
  procurementSummary: {
    procurementListCount: number;
    procurementItemCount: number;
    procurementTotalAmount: number;
    procurementTotalAmountLabel: string;
  };
  contracts: OrderContractSummary[];
  procurementLists: ProcurementListSummary[];
  integrityFlags: string[];
}

export interface ContractListRecord {
  id: string;
  contractName: string;
  description: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileSizeLabel: string;
  source: string;
  sourceLabel: string;
  storageProvider: string;
  downloadAvailable: boolean;
  linkedOrder:
    | {
        id: string;
        orderNo: string;
        projectName: string;
      }
    | undefined;
  linkedCustomer:
    | {
        id: string;
        name: string;
      }
    | undefined;
  updatedAt: string;
  updatedAtLabel: string;
}

export interface ContractDetailRecord {
  id: string;
  legacyContractId?: string;
  contractName: string;
  description: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  fileSizeLabel: string;
  source: string;
  sourceLabel: string;
  storageProvider: string;
  versionNo: number;
  downloadAvailable: boolean;
  createdAt: string;
  createdAtLabel: string;
  updatedAt: string;
  updatedAtLabel: string;
  linkedOrder:
    | {
        id: string;
        orderNo: string;
        projectName: string;
      }
    | undefined;
  linkedCustomer:
    | {
        id: string;
        name: string;
      }
    | undefined;
}

export interface ContractDownloadFile {
  fileName: string;
  filePath: string;
  mimeType: string;
}

export interface CreateOrderContractPayload {
  contractName?: string;
  description?: string;
  uploadedByUserId?: number;
}

export interface UpdateContractPayload {
  orderId?: number | null;
  contractName?: string;
  description?: string;
  updatedByUserId?: number;
}

export interface UpdateOrderPayload {
  projectName: string;
  projectContent?: string;
  amount: number;
  isPaid: boolean;
  hasContract: boolean;
  hasDeliveryNote: boolean;
  orderDate?: Date;
  remark?: string;
  operatorUserId?: number;
}

export interface UploadContractFileLike {
  originalname: string;
  mimetype?: string;
  size: number;
  buffer: Buffer;
}

interface ProcurementListSummary {
  id: string;
  listNo: string;
  title: string;
  platform: string;
  status: 'draft' | 'generated' | 'exported' | 'closed';
  statusLabel: string;
  itemCount: number;
  totalAmount: number;
  totalAmountLabel: string;
  exportFileUrl?: string;
  updatedAt: string;
  updatedAtLabel: string;
}

interface OrderContractSummary {
  id: string;
  contractName: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileSizeLabel: string;
  source: string;
  sourceLabel: string;
  downloadAvailable: boolean;
  updatedAt: string;
  updatedAtLabel: string;
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(limit = 6): Promise<OrdersOverviewResponse> {
    if (!this.prisma.isConfigured) {
      return {
        demoMode: true,
        summary: {
          totalOrders: 0,
          serviceOrderCount: 0,
          procurementOrderCount: 0,
          paidOrderCount: 0,
          pendingPaymentCount: 0,
          paidOrderAmount: 0,
          paidOrderAmountLabel: formatCurrency(0),
          pendingPaymentAmount: 0,
          pendingPaymentAmountLabel: formatCurrency(0),
          totalOrderAmount: 0,
          totalOrderAmountLabel: formatCurrency(0),
        },
        recentOrders: [],
      };
    }

    const recentOrdersPromise = this.listOrders({
      page: 1,
      pageSize: limit,
    });

    const [
      recentOrders,
      totalOrders,
      serviceOrderCount,
      procurementOrderCount,
      paidOrderCount,
      pendingPaymentCount,
      amountAggregate,
      paidAmountAggregate,
      pendingAmountAggregate,
    ] = await Promise.all([
      recentOrdersPromise,
      this.prisma.order.count({
        where: {
          deletedAt: null,
        },
      }),
      this.prisma.order.count({
        where: {
          deletedAt: null,
          orderType: OrderType.SERVICE,
        },
      }),
      this.prisma.order.count({
        where: {
          deletedAt: null,
          orderType: OrderType.PROCUREMENT,
        },
      }),
      this.prisma.order.count({
        where: {
          deletedAt: null,
          isPaid: true,
        },
      }),
      this.prisma.order.count({
        where: {
          deletedAt: null,
          isPaid: false,
        },
      }),
      this.prisma.order.aggregate({
        where: {
          deletedAt: null,
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.order.aggregate({
        where: {
          deletedAt: null,
          isPaid: true,
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.order.aggregate({
        where: {
          deletedAt: null,
          isPaid: false,
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const totalOrderAmount = toAmountNumber(amountAggregate._sum.amount);
    const paidOrderAmount = toAmountNumber(paidAmountAggregate._sum.amount);
    const pendingPaymentAmount = toAmountNumber(pendingAmountAggregate._sum.amount);

    return {
      demoMode: false,
      summary: {
        totalOrders,
        serviceOrderCount,
        procurementOrderCount,
        paidOrderCount,
        pendingPaymentCount,
        paidOrderAmount,
        paidOrderAmountLabel: formatCurrency(paidOrderAmount),
        pendingPaymentAmount,
        pendingPaymentAmountLabel: formatCurrency(pendingPaymentAmount),
        totalOrderAmount,
        totalOrderAmountLabel: formatCurrency(totalOrderAmount),
      },
      recentOrders: recentOrders.records,
    };
  }

  async listOrders(query: OrderListQuery) {
    if (!this.prisma.isConfigured) {
      return {
        demoMode: true,
        page: query.page,
        pageSize: query.pageSize,
        total: 0,
        records: [] as OrderListRecord[],
      };
    }

    const where = buildOrderWhere(query);
    const skip = (query.page - 1) * query.pageSize;

    const [total, orders] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy: [{ orderDate: 'desc' }, { updatedAt: 'desc' }, { id: 'desc' }],
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
          invoiceProfile: {
            select: {
              id: true,
              customerId: true,
              companyName: true,
              taxNumber: true,
            },
          },
          quoteRequest: {
            select: {
              id: true,
              quoteNo: true,
              customerId: true,
              businessType: true,
              status: true,
            },
          },
          ownerUser: {
            select: {
              username: true,
              nickname: true,
            },
          },
          procurementLists: {
            where: {
              deletedAt: null,
            },
            orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
            take: 3,
            include: {
              platform: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const orderIds = orders.map((item) => item.id);
    const procurementStats =
      orderIds.length === 0
        ? []
        : await this.prisma.procurementList.groupBy({
            by: ['orderId'],
            where: {
              deletedAt: null,
              orderId: {
                in: orderIds,
              },
            },
            _count: {
              _all: true,
            },
          });

    const procurementStatsByOrderId = toNumberKeyMap(
      procurementStats,
      'orderId',
    );

    return {
      demoMode: false,
      page: query.page,
      pageSize: query.pageSize,
      total,
      records: orders.map((item) => {
        const integrityFlags = buildOrderIntegrityFlags({
          orderCustomerId: item.customerId,
          invoiceProfileCustomerId: item.invoiceProfile?.customerId,
          quoteRequestCustomerId: item.quoteRequest?.customerId ?? undefined,
        });
        const procurementPlatforms = Array.from(
          new Set(item.procurementLists.map((list) => list.platform.name)),
        );

        return {
          id: String(item.id),
          orderNo: item.orderNo,
          orderType: mapOrderTypeKey(item.orderType),
          orderTypeLabel: mapOrderTypeLabel(item.orderType),
          customer: {
            id: String(item.customer.id),
            name: item.customer.name,
          },
          projectName: item.projectName,
          projectContentPreview: truncateText(item.projectContent ?? ''),
          amount: toAmountNumber(item.amount),
          amountLabel: formatCurrency(item.amount),
          isPaid: item.isPaid,
          paymentStatusLabel: item.isPaid ? '已收款' : '待收款',
          hasContract: item.hasContract,
          hasDeliveryNote: item.hasDeliveryNote,
          orderDate: formatDateValue(item.orderDate),
          orderDateLabel: formatDateLabel(item.orderDate),
          invoiceProfile: item.invoiceProfile
            ? {
                id: String(item.invoiceProfile.id),
                companyName: item.invoiceProfile.companyName,
                taxNumber: item.invoiceProfile.taxNumber,
                customerId: String(item.invoiceProfile.customerId),
              }
            : undefined,
          quoteRequest: item.quoteRequest
            ? {
                id: String(item.quoteRequest.id),
                quoteNo: item.quoteRequest.quoteNo,
                businessType: mapBusinessTypeKey(
                  item.quoteRequest.businessType,
                ),
                businessTypeLabel: mapBusinessTypeLabel(
                  item.quoteRequest.businessType,
                ),
                status: mapQuoteStatusKey(item.quoteRequest.status),
                statusLabel: mapQuoteStatusLabel(item.quoteRequest.status),
              }
            : undefined,
          owner:
            item.ownerUser?.nickname ?? item.ownerUser?.username ?? '待分配',
          procurementListCount:
            procurementStatsByOrderId.get(item.id)?._count._all ?? 0,
          procurementPlatforms,
          integrityFlags,
          updatedAt: item.updatedAt.toISOString(),
          updatedAtLabel: formatDateTimeLabel(item.updatedAt),
        } satisfies OrderListRecord;
      }),
    };
  }

  async getOrderDetail(id: number) {
    if (!this.prisma.isConfigured) {
      throw new NotFoundException('当前环境未配置数据库，无法读取订单详情。');
    }

    const order = await this.prisma.order.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            source: true,
            customerType: true,
          },
        },
        invoiceProfile: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        quoteRequest: {
          select: {
            id: true,
            quoteNo: true,
            customerId: true,
            companyName: true,
            contactName: true,
            businessType: true,
            status: true,
            estimatedTotalAmount: true,
            updatedAt: true,
          },
        },
        ownerUser: {
          select: {
            username: true,
            nickname: true,
          },
        },
        contracts: {
          where: {
            deletedAt: null,
          },
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        },
        procurementLists: {
          where: {
            deletedAt: null,
          },
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          include: {
            platform: {
              select: {
                name: true,
              },
            },
            items: {
              orderBy: {
                id: 'asc',
              },
              select: {
                subtotal: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`未找到 ID=${id} 的订单。`);
    }

    const integrityFlags = buildOrderIntegrityFlags({
      orderCustomerId: order.customerId,
      invoiceProfileCustomerId: order.invoiceProfile?.customerId,
      quoteRequestCustomerId: order.quoteRequest?.customerId ?? undefined,
    });
    const procurementItemCount = order.procurementLists.reduce(
      (sum, item) => sum + item.items.length,
      0,
    );
    const procurementTotalAmount = order.procurementLists.reduce(
      (sum, item) =>
        sum +
        item.items.reduce(
          (lineSum, line) => lineSum + toAmountNumber(line.subtotal),
          0,
        ),
      0,
    );

    return {
      demoMode: false,
      record: {
        id: String(order.id),
        orderNo: order.orderNo,
        orderType: mapOrderTypeKey(order.orderType),
        orderTypeLabel: mapOrderTypeLabel(order.orderType),
        projectName: order.projectName,
        projectContent: order.projectContent ?? '',
        amount: toAmountNumber(order.amount),
        amountLabel: formatCurrency(order.amount),
        isPaid: order.isPaid,
        paymentStatusLabel: order.isPaid ? '已收款' : '待收款',
        hasContract: order.hasContract,
        hasDeliveryNote: order.hasDeliveryNote,
        orderDate: formatDateValue(order.orderDate),
        orderDateLabel: formatDateLabel(order.orderDate),
        remark: order.remark ?? '',
        createdAt: order.createdAt.toISOString(),
        createdAtLabel: formatDateTimeLabel(order.createdAt),
        updatedAt: order.updatedAt.toISOString(),
        updatedAtLabel: formatDateTimeLabel(order.updatedAt),
        owner:
          order.ownerUser?.nickname ?? order.ownerUser?.username ?? '待分配',
        customer: {
          id: String(order.customer.id),
          name: order.customer.name,
          source: order.customer.source ?? '-',
          customerType: mapCustomerTypeKey(order.customer.customerType),
          customerTypeLabel: mapCustomerTypeLabel(order.customer.customerType),
        },
        invoiceProfile: order.invoiceProfile
          ? {
              id: String(order.invoiceProfile.id),
              customerId: String(order.invoiceProfile.customer.id),
              customerName: order.invoiceProfile.customer.name,
              companyName: order.invoiceProfile.companyName,
              taxNumber: order.invoiceProfile.taxNumber,
              address: order.invoiceProfile.address ?? '',
              phone: order.invoiceProfile.phone ?? '',
              bankName: order.invoiceProfile.bankName ?? '',
              bankAccount: order.invoiceProfile.bankAccount ?? '',
            }
          : undefined,
        quoteRequest: order.quoteRequest
          ? {
              id: String(order.quoteRequest.id),
              quoteNo: order.quoteRequest.quoteNo,
              customerId: order.quoteRequest.customerId
                ? String(order.quoteRequest.customerId)
                : undefined,
              companyName: order.quoteRequest.companyName ?? '',
              contactName: order.quoteRequest.contactName,
              businessType: mapBusinessTypeKey(order.quoteRequest.businessType),
              businessTypeLabel: mapBusinessTypeLabel(
                order.quoteRequest.businessType,
              ),
              status: mapQuoteStatusKey(order.quoteRequest.status),
              statusLabel: mapQuoteStatusLabel(order.quoteRequest.status),
              estimatedTotalAmount: toAmountNumber(
                order.quoteRequest.estimatedTotalAmount,
              ),
              estimatedTotalAmountLabel: formatCurrency(
                order.quoteRequest.estimatedTotalAmount,
              ),
              updatedAt: order.quoteRequest.updatedAt.toISOString(),
              updatedAtLabel: formatDateTimeLabel(order.quoteRequest.updatedAt),
            }
          : undefined,
        procurementSummary: {
          procurementListCount: order.procurementLists.length,
          procurementItemCount,
          procurementTotalAmount,
          procurementTotalAmountLabel: formatCurrency(procurementTotalAmount),
        },
        contracts: await Promise.all(
          order.contracts.map(async (item) => ({
            id: String(item.id),
            contractName: item.contractName,
            fileName: item.fileName,
            fileType: normalizeFileType(item.fileType),
            fileSize: toBigIntNumber(item.fileSize),
            fileSizeLabel: formatFileSize(item.fileSize),
            source: normalizeContractSource(item.source),
            sourceLabel: mapContractSourceLabel(item.source),
            downloadAvailable: await canAccessLocalFile(item.filePath),
            updatedAt: item.updatedAt.toISOString(),
            updatedAtLabel: formatDateTimeLabel(item.updatedAt),
          })),
        ),
        procurementLists: order.procurementLists.map((item) => {
          const totalAmount = item.items.reduce(
            (sum, line) => sum + toAmountNumber(line.subtotal),
            0,
          );

          return {
            id: String(item.id),
            listNo: item.listNo,
            title: item.title,
            platform: item.platform.name,
            status: mapProcurementStatusKey(item.status),
            statusLabel: mapProcurementStatusLabel(item.status),
            itemCount: item.items.length,
            totalAmount,
            totalAmountLabel: formatCurrency(totalAmount),
            exportFileUrl: item.exportFileUrl ?? undefined,
            updatedAt: item.updatedAt.toISOString(),
            updatedAtLabel: formatDateTimeLabel(item.updatedAt),
          } satisfies ProcurementListSummary;
        }),
        integrityFlags,
      } satisfies OrderDetailRecord,
    };
  }

  async updateOrder(id: number, payload: UpdateOrderPayload) {
    if (!this.prisma.isConfigured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL 未配置，当前不能编辑订单。',
      );
    }

    const projectName = normalizeText(payload.projectName);
    if (!projectName) {
      throw new BadRequestException('projectName 不能为空。');
    }

    const order = await this.prisma.order.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`未找到 ID=${id} 的订单。`);
    }

    if (!payload.hasContract) {
      const contractCount = await this.prisma.contract.count({
        where: {
          orderId: id,
          deletedAt: null,
        },
      });

      if (contractCount > 0) {
        throw new BadRequestException(
          '当前订单已关联合同档案，不能手动改为暂无合同。',
        );
      }
    }

    await this.prisma.order.update({
      where: {
        id,
      },
      data: {
        projectName,
        projectContent: normalizeText(payload.projectContent) ?? null,
        amount: payload.amount,
        isPaid: payload.isPaid,
        hasContract: payload.hasContract,
        hasDeliveryNote: payload.hasDeliveryNote,
        orderDate: payload.orderDate ?? null,
        remark: normalizeText(payload.remark) ?? null,
        updatedBy: payload.operatorUserId ?? undefined,
      },
    });

    const detail = await this.getOrderDetail(id);

    return {
      message: '订单已更新。',
      record: detail.record,
    };
  }

  async deleteOrder(id: number, operatorUserId?: number) {
    if (!this.prisma.isConfigured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL 未配置，当前不能删除订单。',
      );
    }

    const order = await this.prisma.order.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        orderNo: true,
        quoteRequestId: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`未找到 ID=${id} 的订单。`);
    }

    const [contractCount, procurementListCount] = await Promise.all([
      this.prisma.contract.count({
        where: {
          orderId: id,
          deletedAt: null,
        },
      }),
      this.prisma.procurementList.count({
        where: {
          orderId: id,
          deletedAt: null,
        },
      }),
    ]);

    if (contractCount > 0 || procurementListCount > 0) {
      if (contractCount > 0 && procurementListCount > 0) {
        throw new BadRequestException(
          '当前订单已关联合同档案和代采清单，请先处理关联记录后再删除。',
        );
      }

      if (contractCount > 0) {
        throw new BadRequestException(
          '当前订单已关联合同档案，请先处理合同记录后再删除。',
        );
      }

      throw new BadRequestException(
        '当前订单已关联代采清单，请先处理代采记录后再删除。',
      );
    }

    let restoredQuote = false;

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: {
          id,
        },
        data: {
          deletedAt: new Date(),
          updatedBy: operatorUserId ?? undefined,
        },
      });

      if (!order.quoteRequestId) {
        return;
      }

      const otherActiveOrderCount = await tx.order.count({
        where: {
          quoteRequestId: order.quoteRequestId,
          deletedAt: null,
          id: {
            not: id,
          },
        },
      });

      if (otherActiveOrderCount > 0) {
        return;
      }

      const restored = await tx.quoteRequest.updateMany({
        where: {
          id: order.quoteRequestId,
          deletedAt: null,
          status: QuoteRequestStatus.CONVERTED,
        },
        data: {
          status: QuoteRequestStatus.PROCESSING,
          updatedBy: operatorUserId ?? undefined,
        },
      });

      restoredQuote = restored.count > 0;
    });

    return {
      message: restoredQuote
        ? `订单 ${order.orderNo} 已删除，来源询价已恢复为跟进中。`
        : `订单 ${order.orderNo} 已删除。`,
    };
  }

  async getContractsOverview(limit = 6): Promise<ContractsOverviewResponse> {
    if (!this.prisma.isConfigured) {
      return {
        demoMode: true,
        summary: {
          totalContracts: 0,
          linkedOrderContracts: 0,
          unlinkedContracts: 0,
          legacyContracts: 0,
        },
        recentContracts: [],
      };
    }

    const recentContractsPromise = this.listContracts({
      page: 1,
      pageSize: limit,
    });

    const [
      recentContracts,
      totalContracts,
      linkedOrderContracts,
      legacyContracts,
    ] = await Promise.all([
      recentContractsPromise,
      this.prisma.contract.count({
        where: {
          deletedAt: null,
        },
      }),
      this.prisma.contract.count({
        where: {
          deletedAt: null,
          orderId: {
            not: null,
          },
        },
      }),
      this.prisma.contract.count({
        where: {
          deletedAt: null,
          source: 'legacy_contract',
        },
      }),
    ]);

    return {
      demoMode: false,
      summary: {
        totalContracts,
        linkedOrderContracts,
        unlinkedContracts: Math.max(totalContracts - linkedOrderContracts, 0),
        legacyContracts,
      },
      recentContracts: recentContracts.records,
    };
  }

  async listContracts(query: ContractListQuery) {
    if (!this.prisma.isConfigured) {
      return {
        demoMode: true,
        page: query.page,
        pageSize: query.pageSize,
        total: 0,
        records: [] as ContractListRecord[],
      };
    }

    const where = buildContractWhere(query);
    const skip = (query.page - 1) * query.pageSize;

    const [total, contracts] = await this.prisma.$transaction([
      this.prisma.contract.count({ where }),
      this.prisma.contract.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        include: {
          order: {
            select: {
              id: true,
              orderNo: true,
              projectName: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    const accessRows = await Promise.all(
      contracts.map((item) => canAccessLocalFile(item.filePath)),
    );

    return {
      demoMode: false,
      page: query.page,
      pageSize: query.pageSize,
      total,
      records: contracts.map((item, index) => ({
        id: String(item.id),
        contractName: item.contractName,
        description: item.description ?? '',
        fileName: item.fileName,
        fileType: normalizeFileType(item.fileType),
        fileSize: toBigIntNumber(item.fileSize),
        fileSizeLabel: formatFileSize(item.fileSize),
        source: normalizeContractSource(item.source),
        sourceLabel: mapContractSourceLabel(item.source),
        storageProvider: item.storageProvider ?? '-',
        downloadAvailable: accessRows[index],
        linkedOrder: item.order
          ? {
              id: String(item.order.id),
              orderNo: item.order.orderNo,
              projectName: item.order.projectName,
            }
          : undefined,
        linkedCustomer: item.customer
          ? {
              id: String(item.customer.id),
              name: item.customer.name,
            }
          : undefined,
        updatedAt: item.updatedAt.toISOString(),
        updatedAtLabel: formatDateTimeLabel(item.updatedAt),
      })) satisfies ContractListRecord[],
    };
  }

  async getContractDetail(id: number) {
    if (!this.prisma.isConfigured) {
      throw new NotFoundException('当前环境未配置数据库，无法读取合同详情。');
    }

    const contract = await this.prisma.contract.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            projectName: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException(`未找到 ID=${id} 的合同档案。`);
    }

    return {
      demoMode: false,
      record: {
        id: String(contract.id),
        legacyContractId: contract.legacyContractId
          ? String(contract.legacyContractId)
          : undefined,
        contractName: contract.contractName,
        description: contract.description ?? '',
        fileName: contract.fileName,
        filePath: contract.filePath ?? '',
        fileType: normalizeFileType(contract.fileType),
        fileSize: toBigIntNumber(contract.fileSize),
        fileSizeLabel: formatFileSize(contract.fileSize),
        source: normalizeContractSource(contract.source),
        sourceLabel: mapContractSourceLabel(contract.source),
        storageProvider: contract.storageProvider ?? '-',
        versionNo: contract.versionNo,
        downloadAvailable: await canAccessLocalFile(contract.filePath),
        createdAt: contract.createdAt.toISOString(),
        createdAtLabel: formatDateTimeLabel(contract.createdAt),
        updatedAt: contract.updatedAt.toISOString(),
        updatedAtLabel: formatDateTimeLabel(contract.updatedAt),
        linkedOrder: contract.order
          ? {
              id: String(contract.order.id),
              orderNo: contract.order.orderNo,
              projectName: contract.order.projectName,
            }
          : undefined,
        linkedCustomer: contract.customer
          ? {
              id: String(contract.customer.id),
              name: contract.customer.name,
            }
          : undefined,
      } satisfies ContractDetailRecord,
    };
  }

  async getContractDownloadFile(id: number): Promise<ContractDownloadFile> {
    if (!this.prisma.isConfigured) {
      throw new NotFoundException('当前环境未配置数据库，无法下载合同文件。');
    }

    const contract = await this.prisma.contract.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        fileName: true,
        filePath: true,
        fileType: true,
      },
    });

    if (!contract || !contract.filePath) {
      throw new NotFoundException(`未找到 ID=${id} 的合同文件。`);
    }

    const downloadable = await canAccessLocalFile(contract.filePath);

    if (!downloadable) {
      throw new NotFoundException(
        '合同源文件当前不可访问，可能仍保存在旧服务器或历史本地目录中。',
      );
    }

    return {
      fileName: contract.fileName,
      filePath: contract.filePath,
      mimeType: resolveContractMimeType(contract.fileType, contract.fileName),
    };
  }

  async updateContract(id: number, payload: UpdateContractPayload) {
    if (!this.prisma.isConfigured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL 未配置，当前不能编辑合同档案。',
      );
    }

    const existing = await this.prisma.contract.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        orderId: true,
        customerId: true,
        contractName: true,
        description: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`未找到 ID=${id} 的合同档案。`);
    }

    const nextOrderId =
      payload.orderId === undefined ? existing.orderId : payload.orderId;
    const nextContractName =
      normalizeText(payload.contractName) ?? existing.contractName;
    const nextDescription =
      payload.description === undefined
        ? existing.description ?? null
        : normalizeText(payload.description) ?? null;

    const nextOrder =
      nextOrderId === null || nextOrderId === undefined
        ? null
        : await this.prisma.order.findFirst({
            where: {
              id: nextOrderId,
              deletedAt: null,
            },
            select: {
              id: true,
              customerId: true,
            },
          });

    if (nextOrderId && !nextOrder) {
      throw new NotFoundException(`未找到 ID=${nextOrderId} 的订单。`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.contract.update({
        where: {
          id,
        },
        data: {
          orderId: nextOrderId ?? null,
          customerId: nextOrder?.customerId ?? null,
          contractName: nextContractName,
          description: nextDescription,
          updatedBy: payload.updatedByUserId ?? undefined,
        },
      });

      if (existing.orderId && existing.orderId !== nextOrderId) {
        await syncOrderHasContractState(
          tx,
          existing.orderId,
          payload.updatedByUserId,
        );
      }

      if (nextOrderId) {
        await tx.order.update({
          where: {
            id: nextOrderId,
          },
          data: {
            hasContract: true,
            updatedBy: payload.updatedByUserId ?? undefined,
          },
        });
      }
    });

    const detail = await this.getContractDetail(id);

    return {
      message: '合同档案已更新。',
      ...detail,
    };
  }

  async deleteContract(id: number, deletedByUserId?: number) {
    if (!this.prisma.isConfigured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL 未配置，当前不能删除合同档案。',
      );
    }

    const existing = await this.prisma.contract.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        orderId: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`未找到 ID=${id} 的合同档案。`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.contract.update({
        where: {
          id,
        },
        data: {
          deletedAt: new Date(),
          updatedBy: deletedByUserId ?? undefined,
        },
      });

      if (existing.orderId) {
        await syncOrderHasContractState(tx, existing.orderId, deletedByUserId);
      }
    });

    return {
      message: '合同档案已删除。',
    };
  }

  async createOrderContract(
    orderId: number,
    payload: CreateOrderContractPayload,
    file: UploadContractFileLike | undefined,
  ) {
    if (!this.prisma.isConfigured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL 未配置，当前不能上传合同文件。',
      );
    }

    if (!file?.buffer?.length) {
      throw new BadRequestException('请先选择要上传的合同文件。');
    }

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        deletedAt: null,
      },
      select: {
        id: true,
        customerId: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`未找到 ID=${orderId} 的订单。`);
    }

    const contractName =
      normalizeText(payload.contractName) ??
      stripFileExtension(file.originalname) ??
      `订单合同-${orderId}`;
    const description = normalizeText(payload.description) ?? null;
    const extension = normalizeFileExtension(file.originalname, file.mimetype);
    const uploadDir = resolve(process.cwd(), '.uploads', 'contracts');

    await mkdir(uploadDir, { recursive: true });

    const storedFileName = `${new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '')}-${randomUUID()}${extension}`;
    const storedPath = resolve(uploadDir, storedFileName);

    await writeFile(storedPath, file.buffer);

    const versionNo =
      (await this.prisma.contract.count({
        where: {
          deletedAt: null,
          orderId,
          contractName,
        },
      })) + 1;

    let created: { id: number };

    try {
      created = await this.prisma.$transaction(async (tx) => {
        const contract = await tx.contract.create({
          data: {
            orderId,
            customerId: order.customerId,
            contractName,
            description,
            fileName: file.originalname,
            filePath: storedPath,
            fileType: normalizeUploadedFileType(file.mimetype, file.originalname),
            fileSize: BigInt(Math.max(file.size, 0)),
            storageProvider: 'local_uploads',
            source: 'manual_upload',
            versionNo,
            uploadedBy: payload.uploadedByUserId ?? null,
            createdBy: payload.uploadedByUserId ?? null,
            updatedBy: payload.uploadedByUserId ?? null,
          },
        });

        await tx.order.update({
          where: {
            id: orderId,
          },
          data: {
            hasContract: true,
            updatedBy: payload.uploadedByUserId ?? undefined,
          },
        });

        return contract;
      });
    } catch (error) {
      await unlink(storedPath).catch(() => undefined);
      throw error;
    }

    const detail = await this.getContractDetail(created.id);

    return {
      message: '合同已上传并挂接到当前订单。',
      ...detail,
    };
  }
}

async function syncOrderHasContractState(
  tx: Prisma.TransactionClient,
  orderId: number,
  updatedByUserId?: number,
) {
  const activeContractCount = await tx.contract.count({
    where: {
      deletedAt: null,
      orderId,
    },
  });

  await tx.order.update({
    where: {
      id: orderId,
    },
    data: {
      hasContract: activeContractCount > 0,
      updatedBy: updatedByUserId ?? undefined,
    },
  });
}

function buildOrderWhere(query: OrderListQuery): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {
    deletedAt: null,
  };

  const search = normalizeText(query.search);
  if (search) {
    where.OR = [
      {
        orderNo: {
          contains: search,
        },
      },
      {
        projectName: {
          contains: search,
        },
      },
      {
        projectContent: {
          contains: search,
        },
      },
      {
        remark: {
          contains: search,
        },
      },
      {
        customer: {
          name: {
            contains: search,
          },
        },
      },
      {
        invoiceProfile: {
          companyName: {
            contains: search,
          },
        },
      },
      {
        quoteRequest: {
          quoteNo: {
            contains: search,
          },
        },
      },
    ];
  }

  if (query.orderType) {
    where.orderType = query.orderType;
  }

  if (query.customerId) {
    where.customerId = query.customerId;
  }

  if (query.isPaid !== undefined) {
    where.isPaid = query.isPaid;
  }

  if (query.hasContract !== undefined) {
    where.hasContract = query.hasContract;
  }

  if (query.hasDeliveryNote !== undefined) {
    where.hasDeliveryNote = query.hasDeliveryNote;
  }

  if (query.dateFrom || query.dateTo) {
    where.orderDate = {};

    if (query.dateFrom) {
      where.orderDate.gte = query.dateFrom;
    }

    if (query.dateTo) {
      where.orderDate.lte = query.dateTo;
    }
  }

  return where;
}

function buildContractWhere(query: ContractListQuery): Prisma.ContractWhereInput {
  const where: Prisma.ContractWhereInput = {
    deletedAt: null,
  };

  const search = normalizeText(query.search);
  if (search) {
    where.OR = [
      {
        contractName: {
          contains: search,
        },
      },
      {
        description: {
          contains: search,
        },
      },
      {
        fileName: {
          contains: search,
        },
      },
      {
        filePath: {
          contains: search,
        },
      },
      {
        order: {
          orderNo: {
            contains: search,
          },
        },
      },
      {
        order: {
          projectName: {
            contains: search,
          },
        },
      },
      {
        customer: {
          name: {
            contains: search,
          },
        },
      },
    ];
  }

  if (query.hasOrder !== undefined) {
    where.orderId = query.hasOrder ? { not: null } : null;
  }

  return where;
}

function buildOrderIntegrityFlags(input: {
  orderCustomerId: number;
  invoiceProfileCustomerId?: number;
  quoteRequestCustomerId?: number;
}) {
  const flags: string[] = [];

  if (
    input.invoiceProfileCustomerId !== undefined &&
    input.invoiceProfileCustomerId !== input.orderCustomerId
  ) {
    flags.push('invoice_profile_customer_mismatch');
  }

  if (
    input.quoteRequestCustomerId !== undefined &&
    input.quoteRequestCustomerId !== input.orderCustomerId
  ) {
    flags.push('quote_request_customer_mismatch');
  }

  return flags;
}

function toNumberKeyMap<T extends Record<K, number | null>, K extends keyof T>(
  rows: T[],
  key: K,
) {
  const result = new Map<number, T>();

  for (const row of rows) {
    const value = row[key];
    if (typeof value === 'number') {
      result.set(value, row);
    }
  }

  return result;
}

function normalizeText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function truncateText(value: string, maxLength = 72) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}...`;
}

function mapCustomerTypeKey(customerType: 'COMPANY' | 'INDIVIDUAL' | null) {
  switch (customerType) {
    case 'COMPANY':
      return 'company' as const;
    case 'INDIVIDUAL':
      return 'individual' as const;
    default:
      return 'unknown' as const;
  }
}

function mapCustomerTypeLabel(customerType: 'COMPANY' | 'INDIVIDUAL' | null) {
  switch (customerType) {
    case 'COMPANY':
      return '企业';
    case 'INDIVIDUAL':
      return '个人';
    default:
      return '未标记';
  }
}

function mapOrderTypeKey(orderType: OrderType) {
  return orderType === OrderType.PROCUREMENT ? 'procurement' : 'service';
}

function mapOrderTypeLabel(orderType: OrderType) {
  return orderType === OrderType.PROCUREMENT ? '试剂耗材代采' : '技术服务';
}

function mapBusinessTypeKey(businessType: BusinessType) {
  switch (businessType) {
    case BusinessType.PROCUREMENT:
      return 'procurement' as const;
    case BusinessType.MIXED:
      return 'mixed' as const;
    default:
      return 'service' as const;
  }
}

function mapBusinessTypeLabel(businessType: BusinessType) {
  switch (businessType) {
    case BusinessType.PROCUREMENT:
      return '代采';
    case BusinessType.MIXED:
      return '混合';
    default:
      return '技术服务';
  }
}

function mapQuoteStatusKey(status: QuoteRequestStatus) {
  switch (status) {
    case QuoteRequestStatus.PROCESSING:
      return 'processing' as const;
    case QuoteRequestStatus.CONVERTED:
      return 'converted' as const;
    case QuoteRequestStatus.CLOSED:
      return 'closed' as const;
    default:
      return 'pending' as const;
  }
}

function mapQuoteStatusLabel(status: QuoteRequestStatus) {
  switch (status) {
    case QuoteRequestStatus.PROCESSING:
      return '跟进中';
    case QuoteRequestStatus.CONVERTED:
      return '已转订单';
    case QuoteRequestStatus.CLOSED:
      return '已关闭';
    default:
      return '待跟进';
  }
}

function mapProcurementStatusKey(status: ProcurementListStatus) {
  switch (status) {
    case ProcurementListStatus.GENERATED:
      return 'generated' as const;
    case ProcurementListStatus.EXPORTED:
      return 'exported' as const;
    case ProcurementListStatus.CLOSED:
      return 'closed' as const;
    default:
      return 'draft' as const;
  }
}

function mapProcurementStatusLabel(status: ProcurementListStatus) {
  switch (status) {
    case ProcurementListStatus.GENERATED:
      return '已生成';
    case ProcurementListStatus.EXPORTED:
      return '已导出';
    case ProcurementListStatus.CLOSED:
      return '已关闭';
    default:
      return '草稿';
  }
}

function normalizeContractSource(source?: string | null) {
  return normalizeText(source) ?? 'manual';
}

function mapContractSourceLabel(source?: string | null) {
  switch (normalizeContractSource(source)) {
    case 'legacy_contract':
      return '旧合同迁移';
    case 'manual_upload':
      return '后台上传';
    default:
      return '手工录入';
  }
}

function normalizeFileType(value?: string | null) {
  const normalized = normalizeText(value);
  return normalized ? normalized.toLowerCase() : '-';
}

function stripFileExtension(fileName?: string | null) {
  const normalized = normalizeText(fileName);
  if (!normalized) {
    return null;
  }

  const dotIndex = normalized.lastIndexOf('.');
  if (dotIndex <= 0) {
    return normalized;
  }

  return normalized.slice(0, dotIndex);
}

function normalizeFileExtension(
  fileName?: string | null,
  mimeType?: string | null,
) {
  const fileNameExtension = extname(fileName ?? '').trim().toLowerCase();
  if (fileNameExtension) {
    return fileNameExtension;
  }

  switch (normalizeText(mimeType)?.toLowerCase()) {
    case 'application/pdf':
      return '.pdf';
    case 'application/msword':
      return '.doc';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return '.docx';
    case 'application/vnd.ms-excel':
      return '.xls';
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return '.xlsx';
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    default:
      return '';
  }
}

function normalizeUploadedFileType(
  mimeType?: string | null,
  fileName?: string | null,
) {
  const fileNameExtension =
    normalizeText(fileName?.split('.').pop())?.toLowerCase() ?? '';

  if (fileNameExtension) {
    return fileNameExtension;
  }

  switch (normalizeText(mimeType)?.toLowerCase()) {
    case 'application/pdf':
      return 'pdf';
    case 'application/msword':
      return 'doc';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'docx';
    case 'application/vnd.ms-excel':
      return 'xls';
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return 'xlsx';
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    default:
      return normalizeText(mimeType)?.toLowerCase() ?? 'bin';
  }
}

function toBigIntNumber(value: bigint | number | string | null | undefined) {
  return Number(value ?? 0);
}

function formatFileSize(value: bigint | number | string | null | undefined) {
  const bytes = toBigIntNumber(value);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const fractionDigits = size >= 100 || unitIndex === 0 ? 0 : 1;
  return `${size.toFixed(fractionDigits)} ${units[unitIndex]}`;
}

async function canAccessLocalFile(filePath?: string | null) {
  const normalized = normalizeText(filePath);

  if (!normalized) {
    return false;
  }

  try {
    await access(normalized, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveContractMimeType(fileType?: string | null, fileName?: string | null) {
  const normalized =
    normalizeText(fileType)?.toLowerCase() ??
    normalizeText(fileName?.split('.').pop())?.toLowerCase() ??
    '';

  switch (normalized) {
    case 'pdf':
      return 'application/pdf';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    default:
      return 'application/octet-stream';
  }
}

function toAmountNumber(
  value: Prisma.Decimal | number | string | null | undefined,
) {
  return Number(value ?? 0);
}

function formatCurrency(
  value: Prisma.Decimal | number | string | null | undefined,
) {
  const amount = toAmountNumber(value);

  return `￥${amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateValue(value: Date | null | undefined) {
  return value ? formatWithTimezone(value, 'date') : undefined;
}

function formatDateLabel(value: Date | null | undefined) {
  return value ? formatWithTimezone(value, 'date') : '-';
}

function formatDateTimeLabel(value: Date | null | undefined) {
  return value ? formatWithTimezone(value, 'datetime') : '-';
}

function formatWithTimezone(value: Date, mode: 'date' | 'datetime') {
  const formatter = new Intl.DateTimeFormat(
    mode === 'date' ? 'en-CA' : 'sv-SE',
    {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...(mode === 'datetime'
        ? {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          }
        : {}),
    },
  );

  return formatter.format(value);
}
