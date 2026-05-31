import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  BusinessType,
  OrderType,
  QuoteRequestSource,
  QuoteRequestStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateContactRequestDto } from './dto/create-contact-request.dto';
import {
  CreateQuoteRequestDto,
  CreateQuoteRequestItemDto,
} from './dto/create-quote-request.dto';

type AdminInquiryBusinessType = '技术服务' | '代采' | '混合';
type AdminInquiryStatus = '待跟进' | '跟进中' | '已转订单' | '已关闭';
type AdminInquirySource = '报价中心' | '官网留言' | '手工录入';
type InquiryMetricTone = 'primary' | 'success' | 'warning' | 'danger';

export interface QuotePoolItem {
  itemName: string;
  itemCode?: string;
  specification?: string;
  quantity: number;
  subtotal: number;
  subtotalLabel: string;
}

type QuotePoolItemInput = Omit<QuotePoolItem, 'subtotalLabel'>;

export interface QuotePoolRecord {
  id: string;
  quoteNo: string;
  customerId?: string;
  customer: string;
  ownerUserId?: string;
  contactName: string;
  contactChannel: string;
  businessType: AdminInquiryBusinessType;
  businessTypeKey: 'service' | 'procurement' | 'mixed';
  status: AdminInquiryStatus;
  statusKey: 'pending' | 'processing' | 'converted' | 'closed';
  source: AdminInquirySource;
  sourceKey: 'quote_center' | 'contact_form' | 'manual';
  owner: string;
  amount: number;
  amountLabel: string;
  itemCount: number;
  itemSummary: string;
  remark: string;
  persisted: boolean;
  linkedOrder?:
    | {
        id: string;
        orderNo: string;
      }
    | undefined;
  createdAt: string;
  createdAtLabel: string;
  updatedAt: string;
  updatedAtLabel: string;
  items: QuotePoolItem[];
}

export interface QuoteDashboardMetric {
  label: string;
  value: string;
  description: string;
  trend: string;
  tone: InquiryMetricTone;
}

export interface QuoteLeadSourceRow {
  source: AdminInquirySource;
  count: number;
  ratio: string;
  description: string;
}

export interface QuoteDashboardInquiryRow {
  customer: string;
  businessType: '技术服务' | '代采' | '混合';
  status: '待跟进' | '清单匹配中' | '已转订单';
  owner: string;
  amount: string;
  updatedAt: string;
}

export interface QuoteOwnerOption {
  id: string;
  label: string;
}

export interface CreateOrderFromQuotePayload {
  customerId: number;
  orderType: OrderType;
  projectName?: string;
  projectContent?: string;
  amount: number;
  isPaid?: boolean;
  hasContract?: boolean;
  hasDeliveryNote?: boolean;
  orderDate?: Date;
  remark?: string;
  invoiceProfileId?: number;
  operatorUserId?: number;
}

const inMemoryQuotePool = createDemoQuotePool();

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  async createPublicRequest(payload: CreateQuoteRequestDto) {
    const normalized = this.normalizePayload(payload);
    const quoteNo = this.generateQuoteNo();

    if (!this.prisma.isConfigured) {
      inMemoryQuotePool.unshift(this.createMemoryRecord(quoteNo, normalized));

      return {
        quoteNo,
        persisted: false,
        status: 'accepted',
        message: '询价已受理，当前环境未配置数据库，已按演示模式返回。',
      };
    }

    const customerId = await this.findOrCreateCustomerId(normalized.companyName, normalized.remark);
    const contactChannel = this.splitContactChannel(normalized.contactChannel);

    await this.prisma.quoteRequest.create({
      data: {
        quoteNo,
        customerId,
        contactName: normalized.contactName,
        contactPhone: contactChannel.phone,
        contactEmail: contactChannel.email,
        companyName: normalized.companyName,
        businessType: mapBusinessTypeToPrisma(normalized.businessType),
        source: QuoteRequestSource.QUOTE_CENTER,
        remark: normalized.remark,
        estimatedTotalAmount: normalized.estimatedTotalAmount,
        items: {
          create: normalized.items.map((item) => ({
            serviceItemId: item.serviceItemId,
            itemCode: item.itemCode,
            itemName: item.itemName,
            specification: item.specification,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            subtotal: item.subtotal,
          })),
        },
      },
    });

    return {
      quoteNo,
      persisted: true,
      status: 'accepted',
      message: '询价已提交并写入系统。',
    };
  }

  async createContactRequest(payload: CreateContactRequestDto) {
    const normalized = this.normalizeContactPayload(payload);
    const quoteNo = this.generateQuoteNo();

    if (!this.prisma.isConfigured) {
      inMemoryQuotePool.unshift(this.createMemoryRecord(quoteNo, normalized, 'contact_form'));

      return {
        quoteNo,
        persisted: false,
        status: 'accepted',
        message: '咨询已受理，当前环境未配置数据库，已按演示模式返回。',
      };
    }

    const customerId = await this.findOrCreateCustomerId(normalized.companyName, normalized.remark);
    const contactChannel = this.splitContactChannel(normalized.contactChannel);

    await this.prisma.quoteRequest.create({
      data: {
        quoteNo,
        customerId,
        contactName: normalized.contactName,
        contactPhone: contactChannel.phone,
        contactEmail: contactChannel.email,
        companyName: normalized.companyName,
        businessType: mapBusinessTypeToPrisma(normalized.businessType),
        source: QuoteRequestSource.CONTACT_FORM,
        remark: normalized.remark,
        estimatedTotalAmount: normalized.estimatedTotalAmount,
        items: {
          create: normalized.items.map((item) => ({
            itemCode: item.itemCode,
            itemName: item.itemName,
            specification: item.specification,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            subtotal: item.subtotal,
          })),
        },
      },
    });

    return {
      quoteNo,
      persisted: true,
      status: 'accepted',
      message: '官网咨询已提交并写入系统。',
    };
  }

  async listRequests(limit = 50) {
    const records = await this.loadQuotePool(limit);

    return {
      demoMode: !this.prisma.isConfigured,
      total: records.length,
      ownerOptions: await this.loadOwnerOptions(),
      records,
    };
  }

  async getDashboardSummary(limit = 6) {
    const records = await this.loadQuotePool(Math.max(limit, 30));
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const pendingCount = records.filter((item) =>
      item.statusKey === 'pending' || item.statusKey === 'processing',
    ).length;

    const serviceAmount = records
      .filter(
        (item) =>
          item.businessTypeKey === 'service' &&
          new Date(item.createdAt).getTime() >= monthStart.getTime(),
      )
      .reduce((sum, item) => sum + item.amount, 0);

    const procurementAmount = records
      .filter(
        (item) =>
          item.businessTypeKey === 'procurement' &&
          new Date(item.createdAt).getTime() >= monthStart.getTime(),
      )
      .reduce((sum, item) => sum + item.amount, 0);

    const unassignedCount = records.filter((item) => item.owner === '待分配').length;
    const convertedCount = records.filter((item) => item.statusKey === 'converted').length;
    const conversionRate = records.length === 0 ? 0 : Math.round((convertedCount / records.length) * 100);

    const metrics: QuoteDashboardMetric[] = [
      {
        label: '待跟进询价',
        value: String(pendingCount),
        description: `当前询价池共 ${records.length} 条记录，优先处理未分配和待跟进条目。`,
        trend: `${Math.min(records.length, 7)} 条近期新增`,
        tone: pendingCount > 0 ? 'warning' : 'success',
      },
      {
        label: '本月技术服务询价额',
        value: formatCurrency(serviceAmount),
        description: '按官网报价中心与手工录入汇总，便于先盯技术服务线索密度。',
        trend: `${records.filter((item) => item.businessTypeKey === 'service').length} 条`,
        tone: 'primary',
      },
      {
        label: '本月代采需求额',
        value: formatCurrency(procurementAmount),
        description: '代采仍以提交询价为主，后续可继续衔接采购清单与订单。',
        trend: `${records.filter((item) => item.businessTypeKey === 'procurement').length} 条`,
        tone: 'success',
      },
      {
        label: '待分配线索',
        value: String(unassignedCount),
        description: '适合销售先分配负责人，避免官网线索沉底。',
        trend: this.prisma.isConfigured ? '数据库模式' : '演示受理模式',
        tone: unassignedCount > 0 ? 'danger' : 'success',
      },
      {
        label: '转单占比',
        value: `${conversionRate}%`,
        description: '当前按询价状态粗略估算，订单模块接通后再换成正式经营口径。',
        trend: `${convertedCount} 条已转订单`,
        tone: conversionRate >= 30 ? 'success' : 'warning',
      },
    ];

    const sourceRows = buildLeadSourceRows(records);

    const recentInquiries: QuoteDashboardInquiryRow[] = records.slice(0, limit).map((item) => ({
      customer: item.customer,
      businessType: item.businessType,
      status: mapDashboardStatus(item.statusKey),
      owner: item.owner,
      amount: item.amountLabel,
      updatedAt: item.updatedAtLabel,
    }));

    return {
      demoMode: !this.prisma.isConfigured,
      metrics,
      leadSources: sourceRows,
      recentInquiries,
    };
  }

  private async loadQuotePool(limit: number) {
    if (!this.prisma.isConfigured) {
      return inMemoryQuotePool
        .slice()
        .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
        .slice(0, limit)
        .map((item) => ({
          ...item,
          amountLabel: formatCurrency(item.amount),
          createdAtLabel: formatDateLabel(item.createdAt),
          updatedAtLabel: formatDateLabel(item.updatedAt),
          items: item.items.map((detail) => ({
            ...detail,
            subtotalLabel: formatCurrency(detail.subtotal),
          })),
        }));
    }

    const requests = await this.prisma.quoteRequest.findMany({
      where: {
        deletedAt: null,
      },
      take: limit,
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        customer: {
          select: {
            name: true,
          },
        },
        ownerUser: {
          select: {
            username: true,
            nickname: true,
          },
        },
        items: {
          orderBy: {
            id: 'asc',
          },
        },
        orders: {
          where: {
            deletedAt: null,
          },
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          take: 1,
          select: {
            id: true,
            orderNo: true,
          },
        },
      },
    });

    return requests.map((request) => {
      const items = request.items.map((item) => ({
        itemName: item.itemName,
        itemCode: item.itemCode ?? undefined,
        specification: item.specification ?? undefined,
        quantity: Number(item.quantity),
        subtotal: Number(item.subtotal),
        subtotalLabel: formatCurrency(Number(item.subtotal)),
      }));
      const amount = Number(request.estimatedTotalAmount);

      return {
        id: String(request.id),
        quoteNo: request.quoteNo,
        customerId: request.customerId ? String(request.customerId) : undefined,
        customer: request.companyName ?? request.customer?.name ?? request.contactName,
        ownerUserId: request.ownerUserId ? String(request.ownerUserId) : undefined,
        contactName: request.contactName,
        contactChannel: request.contactPhone ?? request.contactEmail ?? '-',
        businessType: mapBusinessTypeLabel(request.businessType),
        businessTypeKey: mapBusinessTypeKey(request.businessType),
        status: mapStatusLabel(request.status),
        statusKey: mapStatusKey(request.status),
        source: mapSourceLabel(request.source),
        sourceKey: mapSourceKey(request.source),
        owner: request.ownerUser?.nickname ?? request.ownerUser?.username ?? '待分配',
        amount,
        amountLabel: formatCurrency(amount),
        itemCount: items.length,
        itemSummary: items.slice(0, 2).map((item) => item.itemName).join(' / '),
        remark: request.remark ?? '',
        persisted: true,
        linkedOrder: request.orders[0]
          ? {
              id: String(request.orders[0].id),
              orderNo: request.orders[0].orderNo,
            }
          : undefined,
        createdAt: request.createdAt.toISOString(),
        createdAtLabel: formatDateLabel(request.createdAt.toISOString()),
        updatedAt: request.updatedAt.toISOString(),
        updatedAtLabel: formatDateLabel(request.updatedAt.toISOString()),
        items,
      } satisfies QuotePoolRecord;
    });
  }

  async updateRequestStatus(
    id: number,
    status: QuoteRequestStatus,
    operatorUserId?: number,
  ) {
    if (!this.prisma.isConfigured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL 未配置，当前不能更新询价状态。',
      );
    }

    const request = await this.prisma.quoteRequest.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!request) {
      throw new NotFoundException(`未找到 ID=${id} 的询价记录。`);
    }

    if (
      request.status === QuoteRequestStatus.CONVERTED &&
      status !== QuoteRequestStatus.CONVERTED
    ) {
      throw new BadRequestException('已转订单的询价不能再改回其他状态。');
    }

    if (
      status === QuoteRequestStatus.CONVERTED &&
      request.status !== QuoteRequestStatus.CONVERTED
    ) {
      const existingOrder = await this.prisma.order.findFirst({
        where: {
          quoteRequestId: id,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!existingOrder) {
        throw new BadRequestException('请先从当前询价创建订单，再将状态标记为已转订单。');
      }
    }

    await this.prisma.quoteRequest.update({
      where: {
        id,
      },
      data: {
        status,
        updatedBy: operatorUserId ?? undefined,
      },
    });

    return {
      message: '询价状态已更新。',
      record: await this.getRequestRecord(id),
    };
  }

  async assignRequestOwner(
    id: number,
    ownerUserId: number | undefined,
    operatorUserId?: number,
  ) {
    if (!this.prisma.isConfigured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL 未配置，当前不能指派询价负责人。',
      );
    }

    await this.ensureQuoteRequestExists(id);

    if (ownerUserId !== undefined) {
      const owner = await this.prisma.adminUser.findFirst({
        where: {
          id: ownerUserId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!owner) {
        throw new NotFoundException(`未找到 ID=${ownerUserId} 的管理员。`);
      }
    }

    await this.prisma.quoteRequest.update({
      where: {
        id,
      },
      data: {
        ownerUserId: ownerUserId ?? null,
        updatedBy: operatorUserId ?? undefined,
      },
    });

    return {
      message: ownerUserId ? '负责人已更新。' : '负责人已清空。',
      record: await this.getRequestRecord(id),
    };
  }

  async deleteRequest(id: number, operatorUserId?: number) {
    if (!this.prisma.isConfigured) {
      const recordIndex = inMemoryQuotePool.findIndex(
        (item) => item.id === String(id),
      );

      if (recordIndex < 0) {
        throw new NotFoundException(`未找到 ID=${id} 的询价记录。`);
      }

      const [deletedRecord] = inMemoryQuotePool.splice(recordIndex, 1);

      return {
        message: `询价 ${deletedRecord.quoteNo} 已删除。`,
      };
    }

    const request = await this.prisma.quoteRequest.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        quoteNo: true,
      },
    });

    if (!request) {
      throw new NotFoundException(`未找到 ID=${id} 的询价记录。`);
    }

    await this.prisma.quoteRequest.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
        updatedBy: operatorUserId ?? undefined,
      },
    });

    return {
      message: `询价 ${request.quoteNo} 已删除。`,
    };
  }

  async createOrderFromRequest(id: number, payload: CreateOrderFromQuotePayload) {
    if (!this.prisma.isConfigured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL 未配置，当前不能从询价创建订单。',
      );
    }

    const projectName = payload.projectName?.trim();
    if (!projectName) {
      throw new BadRequestException('projectName 不能为空。');
    }

    const request = await this.prisma.quoteRequest.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        items: {
          orderBy: {
            id: 'asc',
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`未找到 ID=${id} 的询价记录。`);
    }

    const existingOrder = await this.prisma.order.findFirst({
      where: {
        quoteRequestId: id,
        deletedAt: null,
      },
      select: {
        id: true,
        orderNo: true,
      },
    });

    if (existingOrder) {
      throw new BadRequestException(
        `该询价已关联订单 ${existingOrder.orderNo}，不能重复创建。`,
      );
    }

    const customer = await this.prisma.customer.findFirst({
      where: {
        id: payload.customerId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!customer) {
      throw new NotFoundException(`未找到 ID=${payload.customerId} 的客户。`);
    }

    if (payload.invoiceProfileId !== undefined) {
      const invoiceProfile = await this.prisma.invoiceProfile.findFirst({
        where: {
          id: payload.invoiceProfileId,
          deletedAt: null,
        },
        select: {
          id: true,
          customerId: true,
        },
      });

      if (!invoiceProfile) {
        throw new NotFoundException(
          `未找到 ID=${payload.invoiceProfileId} 的开票资料。`,
        );
      }

      if (invoiceProfile.customerId !== payload.customerId) {
        throw new BadRequestException('所选开票资料不属于当前客户。');
      }
    }

    const orderNo = await this.generateOrderNo();
    const normalizedRemark = normalizeText(payload.remark);
    const normalizedContent = normalizeText(payload.projectContent);

    const createdOrder = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNo,
          customerId: payload.customerId,
          quoteRequestId: id,
          orderType: payload.orderType,
          projectName,
          projectContent:
            normalizedContent ?? buildProjectContentFromQuote(request.items),
          amount: payload.amount,
          hasContract: Boolean(payload.hasContract),
          hasDeliveryNote: Boolean(payload.hasDeliveryNote),
          isPaid: Boolean(payload.isPaid),
          orderDate: payload.orderDate,
          invoiceProfileId: payload.invoiceProfileId ?? null,
          ownerUserId: request.ownerUserId ?? null,
          remark: normalizedRemark ?? request.remark ?? null,
          createdBy: payload.operatorUserId ?? null,
          updatedBy: payload.operatorUserId ?? null,
        },
        select: {
          id: true,
          orderNo: true,
        },
      });

      await tx.quoteRequest.update({
        where: {
          id,
        },
        data: {
          status: QuoteRequestStatus.CONVERTED,
          updatedBy: payload.operatorUserId ?? undefined,
        },
      });

      return order;
    });

    return {
      message: '已从询价创建订单，并回填询价状态为已转订单。',
      order: {
        id: String(createdOrder.id),
        orderNo: createdOrder.orderNo,
      },
      quoteRequest: await this.getRequestRecord(id),
    };
  }

  private createMemoryRecord(
    quoteNo: string,
    payload: NormalizedQuotePayload,
    sourceKey: QuotePoolRecord['sourceKey'] = 'quote_center',
  ): QuotePoolRecord {
    const now = new Date().toISOString();
    const amount = payload.estimatedTotalAmount;
    const customer = payload.companyName || payload.contactName;

    return {
      id: quoteNo,
      quoteNo,
      customer,
      contactName: payload.contactName,
      contactChannel: payload.contactChannel,
      businessType: mapMemoryBusinessTypeLabel(payload.businessType),
      businessTypeKey: payload.businessType,
      status: '待跟进',
      statusKey: 'pending',
      source: mapMemorySourceLabel(sourceKey),
      sourceKey,
      owner: '待分配',
      amount,
      amountLabel: formatCurrency(amount),
      itemCount: payload.items.length,
      itemSummary: payload.items.slice(0, 2).map((item) => item.itemName).join(' / '),
      remark: payload.remark ?? '',
      persisted: false,
      createdAt: now,
      createdAtLabel: formatDateLabel(now),
      updatedAt: now,
      updatedAtLabel: formatDateLabel(now),
      items: payload.items.map((item) => ({
        itemName: item.itemName,
        itemCode: item.itemCode,
        specification: item.specification,
        quantity: item.quantity,
        subtotal: item.subtotal,
        subtotalLabel: formatCurrency(item.subtotal),
      })),
    };
  }

  private normalizePayload(payload: CreateQuoteRequestDto): NormalizedQuotePayload {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('提交内容不能为空。');
    }

    const businessType = payload.businessType;
    if (businessType !== 'service' && businessType !== 'procurement') {
      throw new BadRequestException('业务类型无效。');
    }

    const contactName = payload.contactName?.trim();
    const contactChannel = payload.contactChannel?.trim();
    const companyName = payload.companyName?.trim();
    const remark = payload.remark?.trim();

    if (!contactName) {
      throw new BadRequestException('请填写联系人姓名。');
    }

    if (!contactChannel) {
      throw new BadRequestException('请填写联系方式。');
    }

    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      throw new BadRequestException('请至少提交一条询价条目。');
    }

    const items = payload.items.map((item) => this.normalizeItem(item));
    const estimatedTotalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

    return {
      businessType,
      contactName,
      contactChannel,
      companyName,
      remark,
      items,
      estimatedTotalAmount,
    };
  }

  private normalizeContactPayload(payload: CreateContactRequestDto): NormalizedQuotePayload {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('提交内容不能为空。');
    }

    const contactName = payload.contactName?.trim();
    const contactChannel = payload.contactChannel?.trim();
    const companyName = payload.companyName?.trim();
    const subject = payload.subject?.trim();
    const message = payload.message?.trim();

    if (!contactName) {
      throw new BadRequestException('请填写联系人姓名。');
    }

    if (!contactChannel) {
      throw new BadRequestException('请填写联系方式。');
    }

    if (!message) {
      throw new BadRequestException('请填写咨询内容。');
    }

    return {
      businessType: 'mixed',
      contactName,
      contactChannel,
      companyName,
      remark: [
        subject ? `咨询主题：${subject}` : undefined,
        `官网留言：${message}`,
      ]
        .filter(Boolean)
        .join('\n'),
      estimatedTotalAmount: 0,
      items: [
        {
          itemName: '官网商务咨询',
          specification: subject || '官网留言',
          quantity: 1,
          unitPrice: 0,
          subtotal: 0,
        },
      ],
    };
  }

  private normalizeItem(item: CreateQuoteRequestItemDto) {
    const serviceItemId = normalizeServiceItemId(item.serviceItemId);
    const itemName = item.itemName?.trim();
    const itemCode = item.itemCode?.trim();
    const specification = item.specification?.trim();
    const quantity = Number(item.quantity ?? 0);
    const unitPrice = Number(item.unitPrice ?? 0);
    const subtotal = Number(item.subtotal ?? unitPrice * quantity);

    if (!itemName) {
      throw new BadRequestException('条目名称不能为空。');
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException(`条目「${itemName}」数量无效。`);
    }

    return {
      serviceItemId,
      itemName,
      itemCode: itemCode || undefined,
      specification: specification || undefined,
      quantity,
      unitPrice: Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice : 0,
      subtotal: Number.isFinite(subtotal) && subtotal > 0 ? subtotal : 0,
    };
  }

  private async findOrCreateCustomerId(companyName?: string, remark?: string) {
    if (!companyName) {
      return undefined;
    }

    const existing = await this.prisma.customer.findFirst({
      where: {
        name: companyName,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      return existing.id;
    }

    const created = await this.prisma.customer.create({
      data: {
        name: companyName,
        source: 'website_quote_center',
        remark,
      },
      select: {
        id: true,
      },
    });

    return created.id;
  }

  private splitContactChannel(contactChannel: string) {
    const value = contactChannel.trim();

    if (value.includes('@')) {
      return {
        email: value,
        phone: null,
      };
    }

    return {
      email: null,
      phone: value,
    };
  }

  private generateQuoteNo() {
    const now = new Date();
    const datePart = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('');
    const timePart = [
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join('');
    const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();

    return `SB${datePart}${timePart}${randomPart}`;
  }

  private async loadOwnerOptions(): Promise<QuoteOwnerOption[]> {
    if (!this.prisma.isConfigured) {
      return [];
    }

    const users = await this.prisma.adminUser.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: [{ nickname: 'asc' }, { username: 'asc' }],
      select: {
        id: true,
        username: true,
        nickname: true,
      },
    });

    return users.map((item) => ({
      id: String(item.id),
      label: item.nickname?.trim() || item.username,
    }));
  }

  private async getRequestRecord(id: number) {
    if (!this.prisma.isConfigured) {
      const record = inMemoryQuotePool.find((item) => item.id === String(id));

      if (!record) {
        throw new NotFoundException(`未找到 ID=${id} 的询价记录。`);
      }

      return {
        ...record,
        amountLabel: formatCurrency(record.amount),
        createdAtLabel: formatDateLabel(record.createdAt),
        updatedAtLabel: formatDateLabel(record.updatedAt),
        items: record.items.map((item) => ({
          ...item,
          subtotalLabel: formatCurrency(item.subtotal),
        })),
      } satisfies QuotePoolRecord;
    }

    const request = await this.prisma.quoteRequest.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        customer: {
          select: {
            name: true,
          },
        },
        ownerUser: {
          select: {
            username: true,
            nickname: true,
          },
        },
        items: {
          orderBy: {
            id: 'asc',
          },
        },
        orders: {
          where: {
            deletedAt: null,
          },
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          take: 1,
          select: {
            id: true,
            orderNo: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`未找到 ID=${id} 的询价记录。`);
    }

    const items = request.items.map((item) => ({
      itemName: item.itemName,
      itemCode: item.itemCode ?? undefined,
      specification: item.specification ?? undefined,
      quantity: Number(item.quantity),
      subtotal: Number(item.subtotal),
      subtotalLabel: formatCurrency(Number(item.subtotal)),
    }));
    const amount = Number(request.estimatedTotalAmount);

    return {
      id: String(request.id),
      quoteNo: request.quoteNo,
      customerId: request.customerId ? String(request.customerId) : undefined,
      customer: request.companyName ?? request.customer?.name ?? request.contactName,
      ownerUserId: request.ownerUserId ? String(request.ownerUserId) : undefined,
      contactName: request.contactName,
      contactChannel: request.contactPhone ?? request.contactEmail ?? '-',
      businessType: mapBusinessTypeLabel(request.businessType),
      businessTypeKey: mapBusinessTypeKey(request.businessType),
      status: mapStatusLabel(request.status),
      statusKey: mapStatusKey(request.status),
      source: mapSourceLabel(request.source),
      sourceKey: mapSourceKey(request.source),
      owner: request.ownerUser?.nickname ?? request.ownerUser?.username ?? '待分配',
      amount,
      amountLabel: formatCurrency(amount),
      itemCount: items.length,
      itemSummary: items.slice(0, 2).map((item) => item.itemName).join(' / '),
      remark: request.remark ?? '',
      persisted: true,
      linkedOrder: request.orders[0]
        ? {
            id: String(request.orders[0].id),
            orderNo: request.orders[0].orderNo,
          }
        : undefined,
      createdAt: request.createdAt.toISOString(),
      createdAtLabel: formatDateLabel(request.createdAt.toISOString()),
      updatedAt: request.updatedAt.toISOString(),
      updatedAtLabel: formatDateLabel(request.updatedAt.toISOString()),
      items,
    } satisfies QuotePoolRecord;
  }

  private async ensureQuoteRequestExists(id: number) {
    const request = await this.prisma.quoteRequest.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!request) {
      throw new NotFoundException(`未找到 ID=${id} 的询价记录。`);
    }
  }

  private async generateOrderNo() {
    const now = new Date();
    const datePart = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
      const orderNo = `SO${datePart}${randomPart}`;
      const existing = await this.prisma.order.findFirst({
        where: {
          orderNo,
        },
        select: {
          id: true,
        },
      });

      if (!existing) {
        return orderNo;
      }
    }

    throw new ServiceUnavailableException('订单号生成失败，请稍后重试。');
  }
}

type NormalizedQuotePayload = {
  businessType: 'service' | 'procurement' | 'mixed';
  contactName: string;
  contactChannel: string;
  companyName?: string;
  remark?: string;
  estimatedTotalAmount: number;
  items: Array<{
    serviceItemId?: number;
    itemName: string;
    itemCode?: string;
    specification?: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
};

function mapBusinessTypeToPrisma(
  businessType: 'service' | 'procurement' | 'mixed',
): BusinessType {
  if (businessType === 'procurement') {
    return BusinessType.PROCUREMENT;
  }

  if (businessType === 'mixed') {
    return BusinessType.MIXED;
  }

  return BusinessType.SERVICE;
}

function mapBusinessTypeLabel(businessType: BusinessType): AdminInquiryBusinessType {
  if (businessType === BusinessType.PROCUREMENT) {
    return '代采';
  }

  if (businessType === BusinessType.MIXED) {
    return '混合';
  }

  return '技术服务';
}

function mapBusinessTypeKey(
  businessType: BusinessType,
): QuotePoolRecord['businessTypeKey'] {
  if (businessType === BusinessType.PROCUREMENT) {
    return 'procurement';
  }

  if (businessType === BusinessType.MIXED) {
    return 'mixed';
  }

  return 'service';
}

function mapStatusLabel(status: QuoteRequestStatus): AdminInquiryStatus {
  if (status === QuoteRequestStatus.PROCESSING) {
    return '跟进中';
  }

  if (status === QuoteRequestStatus.CONVERTED) {
    return '已转订单';
  }

  if (status === QuoteRequestStatus.CLOSED) {
    return '已关闭';
  }

  return '待跟进';
}

function mapStatusKey(status: QuoteRequestStatus): QuotePoolRecord['statusKey'] {
  if (status === QuoteRequestStatus.PROCESSING) {
    return 'processing';
  }

  if (status === QuoteRequestStatus.CONVERTED) {
    return 'converted';
  }

  if (status === QuoteRequestStatus.CLOSED) {
    return 'closed';
  }

  return 'pending';
}

function mapSourceLabel(source: QuoteRequestSource): AdminInquirySource {
  if (source === QuoteRequestSource.CONTACT_FORM) {
    return '官网留言';
  }

  if (source === QuoteRequestSource.MANUAL) {
    return '手工录入';
  }

  return '报价中心';
}

function mapSourceKey(source: QuoteRequestSource): QuotePoolRecord['sourceKey'] {
  if (source === QuoteRequestSource.CONTACT_FORM) {
    return 'contact_form';
  }

  if (source === QuoteRequestSource.MANUAL) {
    return 'manual';
  }

  return 'quote_center';
}

function mapDashboardStatus(
  status: QuotePoolRecord['statusKey'],
): QuoteDashboardInquiryRow['status'] {
  if (status === 'processing') {
    return '清单匹配中';
  }

  if (status === 'converted') {
    return '已转订单';
  }

  return '待跟进';
}

function mapMemoryBusinessTypeLabel(
  businessType: NormalizedQuotePayload['businessType'],
): AdminInquiryBusinessType {
  if (businessType === 'procurement') {
    return '代采';
  }

  if (businessType === 'mixed') {
    return '混合';
  }

  return '技术服务';
}

function mapMemorySourceLabel(
  sourceKey: QuotePoolRecord['sourceKey'],
): AdminInquirySource {
  if (sourceKey === 'contact_form') {
    return '官网留言';
  }

  if (sourceKey === 'manual') {
    return '手工录入';
  }

  return '报价中心';
}

function buildProjectContentFromQuote(items: Array<{ itemName: string; specification?: string | null }>) {
  return items
    .map((item, index) => {
      const suffix = item.specification ? `（${item.specification}）` : '';
      return `${index + 1}. ${item.itemName}${suffix}`;
    })
    .join('\n');
}

function normalizeText(value: string | undefined | null) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function buildLeadSourceRows(records: QuotePoolRecord[]): QuoteLeadSourceRow[] {
  const groups: Array<{
    key: QuotePoolRecord['sourceKey'];
    label: AdminInquirySource;
    description: string;
  }> = [
    {
      key: 'quote_center',
      label: '报价中心',
      description: '技术服务目录询价与代采需求统一进入这一入口。',
    },
    {
      key: 'contact_form',
      label: '官网留言',
      description: '更适合一般商务咨询、合作意向和补充说明。',
    },
    {
      key: 'manual',
      label: '手工录入',
      description: '旧后台迁移或人工补录的数据会走这一来源。',
    },
  ];

  return groups.map((group) => {
    const count = records.filter((item) => item.sourceKey === group.key).length;
    const ratio = records.length === 0 ? '0%' : `${Math.round((count / records.length) * 100)}%`;

    return {
      source: group.label,
      count,
      ratio,
      description: group.description,
    };
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 0,
  }).format(value);
}

function normalizeServiceItemId(value: number | undefined) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    return undefined;
  }

  return numeric;
}

function formatDateLabel(value: string) {
  const input = new Date(value);
  const diff = Date.now() - input.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) {
    return '刚刚';
  }

  if (minutes < 60) {
    return `${minutes} 分钟前`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} 小时前`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} 天前`;
  }

  return `${input.getMonth() + 1}月${input.getDate()}日 ${String(input.getHours()).padStart(2, '0')}:${String(
    input.getMinutes(),
  ).padStart(2, '0')}`;
}

function createDemoQuotePool(): QuotePoolRecord[] {
  const now = Date.now();

  return [
    createDemoRecord({
      quoteNo: 'SB202605301005RJ01',
      customer: '广东省人民医院',
      contactName: '刘老师',
      contactChannel: '13800138000',
      businessType: '代采',
      businessTypeKey: 'procurement',
      status: '跟进中',
      statusKey: 'processing',
      source: '报价中心',
      sourceKey: 'quote_center',
      owner: '商务 B',
      amount: 9600,
      createdAt: new Date(now - 1000 * 60 * 80).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 35).toISOString(),
      remark: '优先从锐竟与喀斯玛比价，保留高校采购抬头要求。',
      persisted: false,
      items: [
        {
          itemName: 'TSA Plus 荧光四标五色染色试剂盒',
          itemCode: 'TSA-SBWS',
          specification: '平台偏好：锐竟；数量 / 规格：2 盒，50T / 盒',
          quantity: 1,
          subtotal: 9600,
        },
      ],
    }),
    createDemoRecord({
      quoteNo: 'SB202605300955GA93',
      customer: '南方医科大学某课题组',
      contactName: '陈老师',
      contactChannel: 'chen@example.com',
      businessType: '技术服务',
      businessTypeKey: 'service',
      status: '待跟进',
      statusKey: 'pending',
      source: '报价中心',
      sourceKey: 'quote_center',
      owner: '商务 A',
      amount: 14200,
      createdAt: new Date(now - 1000 * 60 * 25).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 15).toISOString(),
      remark: '需要尽快确认样本数量和交付周期。',
      persisted: false,
      items: [
        {
          itemName: '裸鼠皮下移植瘤',
          itemCode: 'GA1093',
          specification: '只',
          quantity: 10,
          subtotal: 12000,
        },
        {
          itemName: '全片扫描 40x',
          itemCode: 'TX5501',
          specification: '张',
          quantity: 11,
          subtotal: 2200,
        },
      ],
    }),
    createDemoRecord({
      quoteNo: 'SB202605291620CS01',
      customer: '华南农业大学动物医学学院',
      contactName: '黄老师',
      contactChannel: '13666668888',
      businessType: '代采',
      businessTypeKey: 'procurement',
      status: '待跟进',
      statusKey: 'pending',
      source: '手工录入',
      sourceKey: 'manual',
      owner: '待分配',
      amount: 7850,
      createdAt: new Date(now - 1000 * 60 * 60 * 6).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 60 * 4).toISOString(),
      remark: '旧后台迁移记录，待补平台链接和清单草稿。',
      persisted: false,
      items: [
        {
          itemName: '乳酸脱氢酶细胞毒性检测试剂盒',
          itemCode: 'RSTQMXBDXJCSJH',
          specification: '平台偏好：锐竟；数量 / 规格：2 盒，500 次',
          quantity: 1,
          subtotal: 7850,
        },
      ],
    }),
    createDemoRecord({
      quoteNo: 'SB202605290920ZX11',
      customer: '中山大学附属第一医院',
      contactName: '周老师',
      contactChannel: 'zhou@example.com',
      businessType: '技术服务',
      businessTypeKey: 'service',
      status: '已转订单',
      statusKey: 'converted',
      source: '报价中心',
      sourceKey: 'quote_center',
      owner: '商务 A',
      amount: 26000,
      createdAt: new Date(now - 1000 * 60 * 60 * 12).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 60 * 8).toISOString(),
      remark: '已确认合同流程，后续转订单模块。',
      persisted: false,
      items: [
        {
          itemName: '多重 IF 染色（四标）',
          itemCode: 'FL3302',
          specification: '张',
          quantity: 20,
          subtotal: 18000,
        },
        {
          itemName: 'Western Blot 半定量分析',
          itemCode: 'BL2030',
          specification: '样本',
          quantity: 31,
          subtotal: 8000,
        },
      ],
    }),
  ];
}

function createDemoRecord(
  record: Omit<
    QuotePoolRecord,
    'id' | 'itemCount' | 'itemSummary' | 'amountLabel' | 'createdAtLabel' | 'updatedAtLabel' | 'items'
  > & {
    items: QuotePoolItemInput[];
  },
): QuotePoolRecord {
  return {
    ...record,
    id: record.quoteNo,
    itemCount: record.items.length,
    itemSummary: record.items.slice(0, 2).map((item) => item.itemName).join(' / '),
    amountLabel: formatCurrency(record.amount),
    createdAtLabel: formatDateLabel(record.createdAt),
    updatedAtLabel: formatDateLabel(record.updatedAt),
    items: record.items.map((item) => ({
      ...item,
      subtotalLabel: formatCurrency(item.subtotal),
    })),
  };
}
