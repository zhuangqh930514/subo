import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BusinessType,
  CustomerType,
  Prisma,
  QuoteRequestStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface CustomerListQuery {
  search?: string;
  customerType?: CustomerType;
  source?: string;
  hasOrders?: boolean;
  hasInvoiceProfiles?: boolean;
  page: number;
  pageSize: number;
}

export interface InvoiceProfileListQuery {
  search?: string;
  customerId?: number;
  defaultOnly?: boolean;
  hasOrders?: boolean;
  page: number;
  pageSize: number;
}

export interface SaveCustomerPayload {
  name: string;
  customerType: CustomerType | null;
  source?: string;
  industry?: string;
  address?: string;
  remark?: string;
}

export interface SaveInvoiceProfilePayload {
  customerId: number;
  companyName: string;
  taxNumber: string;
  address?: string;
  phone?: string;
  bankName?: string;
  bankAccount?: string;
  isDefault: boolean;
}

export interface CrmOverviewResponse {
  demoMode: boolean;
  summary: {
    totalCustomers: number;
    totalInvoiceProfiles: number;
    customersWithOrders: number;
    customersMissingInvoiceProfiles: number;
  };
  recentCustomers: CustomerListRecord[];
  recentInvoiceProfiles: InvoiceProfileListRecord[];
}

export interface CustomerListRecord {
  id: string;
  name: string;
  customerType: 'company' | 'individual' | 'unknown';
  customerTypeLabel: string;
  source: string;
  industry: string;
  address: string;
  remark: string;
  invoiceProfileCount: number;
  orderCount: number;
  quoteRequestCount: number;
  totalOrderAmount: number;
  totalOrderAmountLabel: string;
  lastOrderDate?: string;
  lastOrderDateLabel: string;
  lastQuoteUpdatedAt?: string;
  lastQuoteUpdatedAtLabel: string;
  defaultInvoiceProfile:
    | {
        id: string;
        companyName: string;
        taxNumber: string;
        bankName: string;
        bankAccountMasked: string;
      }
    | undefined;
  updatedAt: string;
  updatedAtLabel: string;
}

export interface CustomerDetailRecord {
  id: string;
  name: string;
  customerType: 'company' | 'individual' | 'unknown';
  customerTypeLabel: string;
  source: string;
  industry: string;
  address: string;
  remark: string;
  createdAt: string;
  createdAtLabel: string;
  updatedAt: string;
  updatedAtLabel: string;
  stats: {
    invoiceProfileCount: number;
    orderCount: number;
    paidOrderCount: number;
    serviceOrderCount: number;
    procurementOrderCount: number;
    quoteRequestCount: number;
    totalOrderAmount: number;
    totalOrderAmountLabel: string;
  };
  invoiceProfiles: InvoiceProfileDetailSummary[];
  orders: CustomerOrderSummary[];
  quoteRequests: CustomerQuoteSummary[];
}

export interface InvoiceProfileListRecord {
  id: string;
  customerId: string;
  customerName: string;
  companyName: string;
  taxNumber: string;
  address: string;
  phone: string;
  bankName: string;
  bankAccountMasked: string;
  isDefault: boolean;
  orderCount: number;
  totalOrderAmount: number;
  totalOrderAmountLabel: string;
  lastOrderDate?: string;
  lastOrderDateLabel: string;
  updatedAt: string;
  updatedAtLabel: string;
}

export interface InvoiceProfileDetailRecord {
  id: string;
  companyName: string;
  taxNumber: string;
  address: string;
  phone: string;
  bankName: string;
  bankAccount: string;
  isDefault: boolean;
  createdAt: string;
  createdAtLabel: string;
  updatedAt: string;
  updatedAtLabel: string;
  customer: {
    id: string;
    name: string;
    customerType: 'company' | 'individual' | 'unknown';
    customerTypeLabel: string;
    source: string;
  };
  stats: {
    orderCount: number;
    totalOrderAmount: number;
    totalOrderAmountLabel: string;
    paidOrderCount: number;
    mismatchedOrderCustomerCount: number;
  };
  orders: InvoiceProfileOrderSummary[];
}

interface CustomerOrderSummary {
  id: string;
  orderNo: string;
  orderType: 'service' | 'procurement';
  orderTypeLabel: string;
  projectName: string;
  amount: number;
  amountLabel: string;
  isPaid: boolean;
  paymentStatusLabel: string;
  hasContract: boolean;
  hasDeliveryNote: boolean;
  orderDate?: string;
  orderDateLabel: string;
  updatedAt: string;
  updatedAtLabel: string;
  invoiceProfile:
    | {
        id: string;
        companyName: string;
        taxNumber: string;
        customerId: string;
      }
    | undefined;
  integrityFlags: string[];
}

interface CustomerQuoteSummary {
  id: string;
  quoteNo: string;
  businessType: 'service' | 'procurement' | 'mixed';
  businessTypeLabel: string;
  status: 'pending' | 'processing' | 'converted' | 'closed';
  statusLabel: string;
  companyName: string;
  contactName: string;
  estimatedTotalAmount: number;
  estimatedTotalAmountLabel: string;
  itemCount: number;
  itemSummary: string;
  createdAt: string;
  createdAtLabel: string;
  updatedAt: string;
  updatedAtLabel: string;
}

interface InvoiceProfileDetailSummary {
  id: string;
  companyName: string;
  taxNumber: string;
  address: string;
  phone: string;
  bankName: string;
  bankAccount: string;
  isDefault: boolean;
  linkedOrderCount: number;
  linkedOrderAmount: number;
  linkedOrderAmountLabel: string;
  updatedAt: string;
  updatedAtLabel: string;
}

interface InvoiceProfileOrderSummary {
  id: string;
  orderNo: string;
  orderType: 'service' | 'procurement';
  orderTypeLabel: string;
  customer: {
    id: string;
    name: string;
  };
  projectName: string;
  amount: number;
  amountLabel: string;
  isPaid: boolean;
  paymentStatusLabel: string;
  hasContract: boolean;
  hasDeliveryNote: boolean;
  orderDate?: string;
  orderDateLabel: string;
  updatedAt: string;
  updatedAtLabel: string;
  integrityFlags: string[];
}

@Injectable()
export class CrmService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(limit = 6): Promise<CrmOverviewResponse> {
    if (!this.prisma.isConfigured) {
      return {
        demoMode: true,
        summary: {
          totalCustomers: 0,
          totalInvoiceProfiles: 0,
          customersWithOrders: 0,
          customersMissingInvoiceProfiles: 0,
        },
        recentCustomers: [],
        recentInvoiceProfiles: [],
      };
    }

    const [
      recentCustomers,
      recentInvoiceProfiles,
      totalCustomers,
      totalInvoiceProfiles,
      customersWithOrders,
      customersMissingInvoiceProfiles,
    ] = await Promise.all([
      this.listCustomers({ page: 1, pageSize: limit }),
      this.listInvoiceProfiles({ page: 1, pageSize: limit }),
      this.prisma.customer.count({
        where: {
          deletedAt: null,
        },
      }),
      this.prisma.invoiceProfile.count({
        where: {
          deletedAt: null,
        },
      }),
      this.prisma.customer.count({
        where: {
          deletedAt: null,
          orders: {
            some: {
              deletedAt: null,
            },
          },
        },
      }),
      this.prisma.customer.count({
        where: {
          deletedAt: null,
          orders: {
            some: {
              deletedAt: null,
            },
          },
          invoiceProfiles: {
            none: {
              deletedAt: null,
            },
          },
        },
      }),
    ]);

    return {
      demoMode: false,
      summary: {
        totalCustomers,
        totalInvoiceProfiles,
        customersWithOrders,
        customersMissingInvoiceProfiles,
      },
      recentCustomers: recentCustomers.records,
      recentInvoiceProfiles: recentInvoiceProfiles.records,
    };
  }

  async listCustomers(query: CustomerListQuery) {
    if (!this.prisma.isConfigured) {
      return {
        demoMode: true,
        page: query.page,
        pageSize: query.pageSize,
        total: 0,
        records: [] as CustomerListRecord[],
      };
    }

    const where = buildCustomerWhere(query);
    const skip = (query.page - 1) * query.pageSize;

    const [total, customers] = await this.prisma.$transaction([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        include: {
          invoiceProfiles: {
            where: {
              deletedAt: null,
            },
            orderBy: [
              { isDefault: 'desc' },
              { updatedAt: 'desc' },
              { id: 'desc' },
            ],
            take: 1,
            select: {
              id: true,
              companyName: true,
              taxNumber: true,
              bankName: true,
              bankAccount: true,
            },
          },
        },
      }),
    ]);

    const customerIds = customers.map((item) => item.id);
    const [invoiceStats, orderStats, quoteStats] =
      customerIds.length === 0
        ? [[], [], []]
        : await Promise.all([
            this.prisma.invoiceProfile.groupBy({
              by: ['customerId'],
              where: {
                deletedAt: null,
                customerId: {
                  in: customerIds,
                },
              },
              _count: {
                _all: true,
              },
            }),
            this.prisma.order.groupBy({
              by: ['customerId'],
              where: {
                deletedAt: null,
                customerId: {
                  in: customerIds,
                },
              },
              _count: {
                _all: true,
              },
              _sum: {
                amount: true,
              },
              _max: {
                orderDate: true,
              },
            }),
            this.prisma.quoteRequest.groupBy({
              by: ['customerId'],
              where: {
                deletedAt: null,
                customerId: {
                  in: customerIds,
                },
              },
              _count: {
                _all: true,
              },
              _max: {
                updatedAt: true,
              },
            }),
          ]);

    const invoiceStatsByCustomerId = toNumberKeyMap(invoiceStats, 'customerId');
    const orderStatsByCustomerId = toNumberKeyMap(orderStats, 'customerId');
    const quoteStatsByCustomerId = toNumberKeyMap(quoteStats, 'customerId');

    return {
      demoMode: false,
      page: query.page,
      pageSize: query.pageSize,
      total,
      records: customers.map((item) => {
        const invoiceStat = invoiceStatsByCustomerId.get(item.id);
        const orderStat = orderStatsByCustomerId.get(item.id);
        const quoteStat = quoteStatsByCustomerId.get(item.id);
        const defaultInvoice = item.invoiceProfiles[0];
        const totalOrderAmount = toAmountNumber(orderStat?._sum.amount);

        return {
          id: String(item.id),
          name: item.name,
          customerType: mapCustomerTypeKey(item.customerType),
          customerTypeLabel: mapCustomerTypeLabel(item.customerType),
          source: item.source ?? '-',
          industry: item.industry ?? '',
          address: item.address ?? '',
          remark: item.remark ?? '',
          invoiceProfileCount: invoiceStat?._count._all ?? 0,
          orderCount: orderStat?._count._all ?? 0,
          quoteRequestCount: quoteStat?._count._all ?? 0,
          totalOrderAmount,
          totalOrderAmountLabel: formatCurrency(totalOrderAmount),
          lastOrderDate: formatDateValue(orderStat?._max.orderDate),
          lastOrderDateLabel: formatDateLabel(orderStat?._max.orderDate),
          lastQuoteUpdatedAt: formatDateTimeValue(quoteStat?._max.updatedAt),
          lastQuoteUpdatedAtLabel: formatDateTimeLabel(
            quoteStat?._max.updatedAt,
          ),
          defaultInvoiceProfile: defaultInvoice
            ? {
                id: String(defaultInvoice.id),
                companyName: defaultInvoice.companyName,
                taxNumber: defaultInvoice.taxNumber,
                bankName: defaultInvoice.bankName ?? '',
                bankAccountMasked: maskBankAccount(defaultInvoice.bankAccount),
              }
            : undefined,
          updatedAt: item.updatedAt.toISOString(),
          updatedAtLabel: formatDateTimeLabel(item.updatedAt),
        } satisfies CustomerListRecord;
      }),
    };
  }

  async getCustomerDetail(id: number) {
    if (!this.prisma.isConfigured) {
      throw new NotFoundException('当前环境未配置数据库，无法读取客户详情。');
    }

    const customer = await this.prisma.customer.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        invoiceProfiles: {
          where: {
            deletedAt: null,
          },
          orderBy: [
            { isDefault: 'desc' },
            { updatedAt: 'desc' },
            { id: 'desc' },
          ],
        },
        orders: {
          where: {
            deletedAt: null,
          },
          orderBy: [
            { orderDate: 'desc' },
            { updatedAt: 'desc' },
            { id: 'desc' },
          ],
          include: {
            invoiceProfile: {
              select: {
                id: true,
                companyName: true,
                taxNumber: true,
                customerId: true,
              },
            },
          },
        },
        quoteRequests: {
          where: {
            deletedAt: null,
          },
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          include: {
            items: {
              orderBy: {
                id: 'asc',
              },
              take: 3,
              select: {
                itemName: true,
              },
            },
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`未找到 ID=${id} 的客户。`);
    }

    const totalOrderAmount = customer.orders.reduce(
      (sum, item) => sum + toAmountNumber(item.amount),
      0,
    );
    const paidOrderCount = customer.orders.filter((item) => item.isPaid).length;
    const serviceOrderCount = customer.orders.filter(
      (item) => item.orderType === 'SERVICE',
    ).length;
    const procurementOrderCount = customer.orders.filter(
      (item) => item.orderType === 'PROCUREMENT',
    ).length;

    return {
      demoMode: false,
      record: {
        id: String(customer.id),
        name: customer.name,
        customerType: mapCustomerTypeKey(customer.customerType),
        customerTypeLabel: mapCustomerTypeLabel(customer.customerType),
        source: customer.source ?? '-',
        industry: customer.industry ?? '',
        address: customer.address ?? '',
        remark: customer.remark ?? '',
        createdAt: customer.createdAt.toISOString(),
        createdAtLabel: formatDateTimeLabel(customer.createdAt),
        updatedAt: customer.updatedAt.toISOString(),
        updatedAtLabel: formatDateTimeLabel(customer.updatedAt),
        stats: {
          invoiceProfileCount: customer.invoiceProfiles.length,
          orderCount: customer.orders.length,
          paidOrderCount,
          serviceOrderCount,
          procurementOrderCount,
          quoteRequestCount: customer.quoteRequests.length,
          totalOrderAmount,
          totalOrderAmountLabel: formatCurrency(totalOrderAmount),
        },
        invoiceProfiles: customer.invoiceProfiles.map((profile) => {
          const linkedOrders = customer.orders.filter(
            (order) => order.invoiceProfileId === profile.id,
          );
          const linkedOrderAmount = linkedOrders.reduce(
            (sum, item) => sum + toAmountNumber(item.amount),
            0,
          );

          return {
            id: String(profile.id),
            companyName: profile.companyName,
            taxNumber: profile.taxNumber,
            address: profile.address ?? '',
            phone: profile.phone ?? '',
            bankName: profile.bankName ?? '',
            bankAccount: profile.bankAccount ?? '',
            isDefault: profile.isDefault,
            linkedOrderCount: linkedOrders.length,
            linkedOrderAmount,
            linkedOrderAmountLabel: formatCurrency(linkedOrderAmount),
            updatedAt: profile.updatedAt.toISOString(),
            updatedAtLabel: formatDateTimeLabel(profile.updatedAt),
          } satisfies InvoiceProfileDetailSummary;
        }),
        orders: customer.orders.map((order) => ({
          id: String(order.id),
          orderNo: order.orderNo,
          orderType: mapOrderTypeKey(order.orderType),
          orderTypeLabel: mapOrderTypeLabel(order.orderType),
          projectName: order.projectName,
          amount: toAmountNumber(order.amount),
          amountLabel: formatCurrency(order.amount),
          isPaid: order.isPaid,
          paymentStatusLabel: order.isPaid ? '已收款' : '待收款',
          hasContract: order.hasContract,
          hasDeliveryNote: order.hasDeliveryNote,
          orderDate: formatDateValue(order.orderDate),
          orderDateLabel: formatDateLabel(order.orderDate),
          updatedAt: order.updatedAt.toISOString(),
          updatedAtLabel: formatDateTimeLabel(order.updatedAt),
          invoiceProfile: order.invoiceProfile
            ? {
                id: String(order.invoiceProfile.id),
                companyName: order.invoiceProfile.companyName,
                taxNumber: order.invoiceProfile.taxNumber,
                customerId: String(order.invoiceProfile.customerId),
              }
            : undefined,
          integrityFlags:
            order.invoiceProfile &&
            order.invoiceProfile.customerId !== customer.id
              ? ['invoice_profile_customer_mismatch']
              : [],
        })),
        quoteRequests: customer.quoteRequests.map((quote) => ({
          id: String(quote.id),
          quoteNo: quote.quoteNo,
          businessType: mapBusinessTypeKey(quote.businessType),
          businessTypeLabel: mapBusinessTypeLabel(quote.businessType),
          status: mapQuoteStatusKey(quote.status),
          statusLabel: mapQuoteStatusLabel(quote.status),
          companyName: quote.companyName ?? '',
          contactName: quote.contactName,
          estimatedTotalAmount: toAmountNumber(quote.estimatedTotalAmount),
          estimatedTotalAmountLabel: formatCurrency(quote.estimatedTotalAmount),
          itemCount: quote.items.length,
          itemSummary: quote.items.map((item) => item.itemName).join(' / '),
          createdAt: quote.createdAt.toISOString(),
          createdAtLabel: formatDateTimeLabel(quote.createdAt),
          updatedAt: quote.updatedAt.toISOString(),
          updatedAtLabel: formatDateTimeLabel(quote.updatedAt),
        })),
      } satisfies CustomerDetailRecord,
    };
  }

  async createCustomer(payload: SaveCustomerPayload, userId?: number) {
    if (!this.prisma.isConfigured) {
      throw new BadRequestException('当前环境未配置数据库，无法新增客户。');
    }

    const created = await this.prisma.customer.create({
      data: {
        name: requireText(payload.name, '客户名称'),
        customerType: payload.customerType,
        source: normalizeText(payload.source) ?? null,
        industry: normalizeText(payload.industry) ?? null,
        address: normalizeText(payload.address) ?? null,
        remark: normalizeText(payload.remark) ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
      select: {
        id: true,
      },
    });

    const detail = await this.getCustomerDetail(created.id);

    return {
      message: '客户已新增。',
      record: detail.record,
    };
  }

  async updateCustomer(id: number, payload: SaveCustomerPayload, userId?: number) {
    if (!this.prisma.isConfigured) {
      throw new BadRequestException('当前环境未配置数据库，无法更新客户。');
    }

    const existing = await this.prisma.customer.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`未找到 ID=${id} 的客户。`);
    }

    await this.prisma.customer.update({
      where: {
        id,
      },
      data: {
        name: requireText(payload.name, '客户名称'),
        customerType: payload.customerType,
        source: normalizeText(payload.source) ?? null,
        industry: normalizeText(payload.industry) ?? null,
        address: normalizeText(payload.address) ?? null,
        remark: normalizeText(payload.remark) ?? null,
        updatedBy: userId,
      },
    });

    const detail = await this.getCustomerDetail(id);

    return {
      message: '客户已更新。',
      record: detail.record,
    };
  }

  async deleteCustomer(id: number, userId?: number) {
    if (!this.prisma.isConfigured) {
      throw new BadRequestException('当前环境未配置数据库，无法删除客户。');
    }

    const existing = await this.prisma.customer.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`未找到 ID=${id} 的客户。`);
    }

    const [invoiceProfileCount, orderCount, quoteRequestCount, contractCount, procurementListCount] =
      await this.prisma.$transaction([
        this.prisma.invoiceProfile.count({
          where: {
            customerId: id,
            deletedAt: null,
          },
        }),
        this.prisma.order.count({
          where: {
            customerId: id,
            deletedAt: null,
          },
        }),
        this.prisma.quoteRequest.count({
          where: {
            customerId: id,
            deletedAt: null,
          },
        }),
        this.prisma.contract.count({
          where: {
            customerId: id,
            deletedAt: null,
          },
        }),
        this.prisma.procurementList.count({
          where: {
            customerId: id,
            deletedAt: null,
          },
        }),
      ]);

    if (
      invoiceProfileCount > 0 ||
      orderCount > 0 ||
      quoteRequestCount > 0 ||
      contractCount > 0 ||
      procurementListCount > 0
    ) {
      throw new BadRequestException(
        '该客户仍有关联的抬头、订单、询价、合同或采购清单，暂不支持删除。',
      );
    }

    await this.prisma.customer.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    return {
      message: '客户已删除。',
    };
  }

  async listInvoiceProfiles(query: InvoiceProfileListQuery) {
    if (!this.prisma.isConfigured) {
      return {
        demoMode: true,
        page: query.page,
        pageSize: query.pageSize,
        total: 0,
        records: [] as InvoiceProfileListRecord[],
      };
    }

    const where = buildInvoiceProfileWhere(query);
    const skip = (query.page - 1) * query.pageSize;

    const [total, invoiceProfiles] = await this.prisma.$transaction([
      this.prisma.invoiceProfile.count({ where }),
      this.prisma.invoiceProfile.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    const profileIds = invoiceProfiles.map((item) => item.id);
    const orderStats =
      profileIds.length === 0
        ? []
        : await this.prisma.order.groupBy({
            by: ['invoiceProfileId'],
            where: {
              deletedAt: null,
              invoiceProfileId: {
                in: profileIds,
              },
            },
            _count: {
              _all: true,
            },
            _sum: {
              amount: true,
            },
            _max: {
              orderDate: true,
            },
          });

    const orderStatsByProfileId = toNumberKeyMap(
      orderStats,
      'invoiceProfileId',
    );

    return {
      demoMode: false,
      page: query.page,
      pageSize: query.pageSize,
      total,
      records: invoiceProfiles.map((item) => {
        const orderStat = orderStatsByProfileId.get(item.id);
        const totalOrderAmount = toAmountNumber(orderStat?._sum.amount);

        return {
          id: String(item.id),
          customerId: String(item.customer.id),
          customerName: item.customer.name,
          companyName: item.companyName,
          taxNumber: item.taxNumber,
          address: item.address ?? '',
          phone: item.phone ?? '',
          bankName: item.bankName ?? '',
          bankAccountMasked: maskBankAccount(item.bankAccount),
          isDefault: item.isDefault,
          orderCount: orderStat?._count._all ?? 0,
          totalOrderAmount,
          totalOrderAmountLabel: formatCurrency(totalOrderAmount),
          lastOrderDate: formatDateValue(orderStat?._max.orderDate),
          lastOrderDateLabel: formatDateLabel(orderStat?._max.orderDate),
          updatedAt: item.updatedAt.toISOString(),
          updatedAtLabel: formatDateTimeLabel(item.updatedAt),
        } satisfies InvoiceProfileListRecord;
      }),
    };
  }

  async getInvoiceProfileDetail(id: number) {
    if (!this.prisma.isConfigured) {
      throw new NotFoundException(
        '当前环境未配置数据库，无法读取发票抬头详情。',
      );
    }

    const invoiceProfile = await this.prisma.invoiceProfile.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            customerType: true,
            source: true,
          },
        },
        orders: {
          where: {
            deletedAt: null,
          },
          orderBy: [
            { orderDate: 'desc' },
            { updatedAt: 'desc' },
            { id: 'desc' },
          ],
          include: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!invoiceProfile) {
      throw new NotFoundException(`未找到 ID=${id} 的发票抬头。`);
    }

    const totalOrderAmount = invoiceProfile.orders.reduce(
      (sum, item) => sum + toAmountNumber(item.amount),
      0,
    );
    const paidOrderCount = invoiceProfile.orders.filter(
      (item) => item.isPaid,
    ).length;
    const mismatchedOrderCustomerCount = invoiceProfile.orders.filter(
      (item) => item.customerId !== invoiceProfile.customer.id,
    ).length;

    return {
      demoMode: false,
      record: {
        id: String(invoiceProfile.id),
        companyName: invoiceProfile.companyName,
        taxNumber: invoiceProfile.taxNumber,
        address: invoiceProfile.address ?? '',
        phone: invoiceProfile.phone ?? '',
        bankName: invoiceProfile.bankName ?? '',
        bankAccount: invoiceProfile.bankAccount ?? '',
        isDefault: invoiceProfile.isDefault,
        createdAt: invoiceProfile.createdAt.toISOString(),
        createdAtLabel: formatDateTimeLabel(invoiceProfile.createdAt),
        updatedAt: invoiceProfile.updatedAt.toISOString(),
        updatedAtLabel: formatDateTimeLabel(invoiceProfile.updatedAt),
        customer: {
          id: String(invoiceProfile.customer.id),
          name: invoiceProfile.customer.name,
          customerType: mapCustomerTypeKey(
            invoiceProfile.customer.customerType,
          ),
          customerTypeLabel: mapCustomerTypeLabel(
            invoiceProfile.customer.customerType,
          ),
          source: invoiceProfile.customer.source ?? '-',
        },
        stats: {
          orderCount: invoiceProfile.orders.length,
          totalOrderAmount,
          totalOrderAmountLabel: formatCurrency(totalOrderAmount),
          paidOrderCount,
          mismatchedOrderCustomerCount,
        },
        orders: invoiceProfile.orders.map((order) => ({
          id: String(order.id),
          orderNo: order.orderNo,
          orderType: mapOrderTypeKey(order.orderType),
          orderTypeLabel: mapOrderTypeLabel(order.orderType),
          customer: {
            id: String(order.customer.id),
            name: order.customer.name,
          },
          projectName: order.projectName,
          amount: toAmountNumber(order.amount),
          amountLabel: formatCurrency(order.amount),
          isPaid: order.isPaid,
          paymentStatusLabel: order.isPaid ? '已收款' : '待收款',
          hasContract: order.hasContract,
          hasDeliveryNote: order.hasDeliveryNote,
          orderDate: formatDateValue(order.orderDate),
          orderDateLabel: formatDateLabel(order.orderDate),
          updatedAt: order.updatedAt.toISOString(),
          updatedAtLabel: formatDateTimeLabel(order.updatedAt),
          integrityFlags:
            order.customerId !== invoiceProfile.customer.id
              ? ['invoice_profile_customer_mismatch']
              : [],
        })),
      } satisfies InvoiceProfileDetailRecord,
    };
  }

  async createInvoiceProfile(payload: SaveInvoiceProfilePayload, userId?: number) {
    if (!this.prisma.isConfigured) {
      throw new BadRequestException('当前环境未配置数据库，无法新增开票资料。');
    }

    const createdId = await this.prisma.$transaction(async (tx) => {
      await this.ensureCustomerExists(tx, payload.customerId);

      if (payload.isDefault) {
        await this.clearDefaultInvoiceProfiles(tx, payload.customerId);
      }

      const created = await tx.invoiceProfile.create({
        data: {
          customerId: payload.customerId,
          companyName: requireText(payload.companyName, '抬头名称'),
          taxNumber: requireText(payload.taxNumber, '税号'),
          address: normalizeText(payload.address) ?? null,
          phone: normalizeText(payload.phone) ?? null,
          bankName: normalizeText(payload.bankName) ?? null,
          bankAccount: normalizeText(payload.bankAccount) ?? null,
          isDefault: payload.isDefault,
          createdBy: userId,
          updatedBy: userId,
        },
        select: {
          id: true,
        },
      });

      return created.id;
    });

    const detail = await this.getInvoiceProfileDetail(createdId);

    return {
      message: payload.isDefault ? '开票资料已新增并设为默认。' : '开票资料已新增。',
      record: detail.record,
    };
  }

  async updateInvoiceProfile(
    id: number,
    payload: SaveInvoiceProfilePayload,
    userId?: number,
  ) {
    if (!this.prisma.isConfigured) {
      throw new BadRequestException('当前环境未配置数据库，无法更新开票资料。');
    }

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.invoiceProfile.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!existing) {
        throw new NotFoundException(`未找到 ID=${id} 的发票抬头。`);
      }

      await this.ensureCustomerExists(tx, payload.customerId);

      if (payload.isDefault) {
        await this.clearDefaultInvoiceProfiles(tx, payload.customerId, id);
      }

      await tx.invoiceProfile.update({
        where: {
          id,
        },
        data: {
          customerId: payload.customerId,
          companyName: requireText(payload.companyName, '抬头名称'),
          taxNumber: requireText(payload.taxNumber, '税号'),
          address: normalizeText(payload.address) ?? null,
          phone: normalizeText(payload.phone) ?? null,
          bankName: normalizeText(payload.bankName) ?? null,
          bankAccount: normalizeText(payload.bankAccount) ?? null,
          isDefault: payload.isDefault,
          updatedBy: userId,
        },
      });
    });

    const detail = await this.getInvoiceProfileDetail(id);

    return {
      message: payload.isDefault ? '开票资料已更新并设为默认。' : '开票资料已更新。',
      record: detail.record,
    };
  }

  async setDefaultInvoiceProfile(id: number, userId?: number) {
    if (!this.prisma.isConfigured) {
      throw new BadRequestException('当前环境未配置数据库，无法设置默认开票资料。');
    }

    const profileId = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.invoiceProfile.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        select: {
          id: true,
          customerId: true,
        },
      });

      if (!existing) {
        throw new NotFoundException(`未找到 ID=${id} 的发票抬头。`);
      }

      await this.clearDefaultInvoiceProfiles(tx, existing.customerId, id);

      await tx.invoiceProfile.update({
        where: {
          id,
        },
        data: {
          isDefault: true,
          updatedBy: userId,
        },
      });

      return existing.id;
    });

    const detail = await this.getInvoiceProfileDetail(profileId);

    return {
      message: '默认开票资料已更新。',
      record: detail.record,
    };
  }

  private async ensureCustomerExists(
    tx: Prisma.TransactionClient,
    customerId: number,
  ) {
    const customer = await tx.customer.findFirst({
      where: {
        id: customerId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!customer) {
      throw new NotFoundException(`未找到 ID=${customerId} 的客户。`);
    }
  }

  private async clearDefaultInvoiceProfiles(
    tx: Prisma.TransactionClient,
    customerId: number,
    excludeId?: number,
  ) {
    await tx.invoiceProfile.updateMany({
      where: {
        customerId,
        deletedAt: null,
        ...(excludeId
          ? {
              NOT: {
                id: excludeId,
              },
            }
          : {}),
      },
      data: {
        isDefault: false,
      },
    });
  }
}

function buildCustomerWhere(
  query: CustomerListQuery,
): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = {
    deletedAt: null,
  };

  const search = normalizeText(query.search);
  if (search) {
    where.OR = [
      {
        name: {
          contains: search,
        },
      },
      {
        address: {
          contains: search,
        },
      },
      {
        industry: {
          contains: search,
        },
      },
      {
        remark: {
          contains: search,
        },
      },
      {
        source: {
          contains: search,
        },
      },
    ];
  }

  if (query.customerType) {
    where.customerType = query.customerType;
  }

  const source = normalizeText(query.source);
  if (source) {
    where.source = {
      contains: source,
    };
  }

  if (query.hasOrders === true) {
    where.orders = {
      some: {
        deletedAt: null,
      },
    };
  }

  if (query.hasOrders === false) {
    where.orders = {
      none: {
        deletedAt: null,
      },
    };
  }

  if (query.hasInvoiceProfiles === true) {
    where.invoiceProfiles = {
      some: {
        deletedAt: null,
      },
    };
  }

  if (query.hasInvoiceProfiles === false) {
    where.invoiceProfiles = {
      none: {
        deletedAt: null,
      },
    };
  }

  return where;
}

function buildInvoiceProfileWhere(
  query: InvoiceProfileListQuery,
): Prisma.InvoiceProfileWhereInput {
  const where: Prisma.InvoiceProfileWhereInput = {
    deletedAt: null,
  };

  const search = normalizeText(query.search);
  if (search) {
    where.OR = [
      {
        companyName: {
          contains: search,
        },
      },
      {
        taxNumber: {
          contains: search,
        },
      },
      {
        address: {
          contains: search,
        },
      },
      {
        phone: {
          contains: search,
        },
      },
      {
        bankName: {
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
    ];
  }

  if (query.customerId) {
    where.customerId = query.customerId;
  }

  if (query.defaultOnly === true) {
    where.isDefault = true;
  }

  if (query.hasOrders === true) {
    where.orders = {
      some: {
        deletedAt: null,
      },
    };
  }

  if (query.hasOrders === false) {
    where.orders = {
      none: {
        deletedAt: null,
      },
    };
  }

  return where;
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

function requireText(value: string | undefined, fieldName: string) {
  const normalized = normalizeText(value);

  if (!normalized) {
    throw new BadRequestException(`${fieldName}不能为空。`);
  }

  return normalized;
}

function mapCustomerTypeKey(customerType: CustomerType | null) {
  switch (customerType) {
    case CustomerType.COMPANY:
      return 'company' as const;
    case CustomerType.INDIVIDUAL:
      return 'individual' as const;
    default:
      return 'unknown' as const;
  }
}

function mapCustomerTypeLabel(customerType: CustomerType | null) {
  switch (customerType) {
    case CustomerType.COMPANY:
      return '企业';
    case CustomerType.INDIVIDUAL:
      return '个人';
    default:
      return '未标记';
  }
}

function mapOrderTypeKey(orderType: 'SERVICE' | 'PROCUREMENT') {
  return orderType === 'PROCUREMENT' ? 'procurement' : 'service';
}

function mapOrderTypeLabel(orderType: 'SERVICE' | 'PROCUREMENT') {
  return orderType === 'PROCUREMENT' ? '试剂耗材代采' : '技术服务';
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

function formatDateTimeValue(value: Date | null | undefined) {
  return value ? formatWithTimezone(value, 'datetime') : undefined;
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

function maskBankAccount(value: string | null | undefined) {
  const normalized = value?.trim();

  if (!normalized) {
    return '';
  }

  if (normalized.length <= 8) {
    return normalized;
  }

  return `${normalized.slice(0, 4)} **** ${normalized.slice(-4)}`;
}
